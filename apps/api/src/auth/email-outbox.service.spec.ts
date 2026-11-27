import { describe, expect, it, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { User, UserStatus } from "./entities/user.entity";
import { PasswordResetToken } from "./entities/password-reset-token.entity";
import { EmailOutboxKind } from "./entities/email-outbox.entity";
import { EmailOutboxCryptoService } from "./email-outbox-crypto.service";
import { AuthMailService } from "./auth-mail.service";
import { EmailOutboxService } from "./email-outbox.service";
import { AuditService } from "../audit/services/audit.service";

function harness(options?: { emailVersion?: number; sendError?: Error }) {
  const key = Buffer.alloc(32, 9).toString("base64");
  const config = new ConfigService({
    email: {
      outboxKeys: JSON.stringify({ local: key }),
      outboxActiveKeyVersion: "local",
      transport: "test",
      frontendOrigin: "http://localhost:3001",
    },
    environment: "test",
  });
  const cryptoService = new EmailOutboxCryptoService(config);
  const token = "A".repeat(43);
  const outboxId = "00000000-0000-4000-8000-000000000001";
  const userId = "00000000-0000-4000-8000-000000000002";
  const encrypted = cryptoService.encrypt(
    outboxId,
    userId,
    EmailOutboxKind.PASSWORD_RESET,
    4,
    token,
  );
  const row = {
    id: outboxId,
    userId,
    kind: EmailOutboxKind.PASSWORD_RESET,
    resetTokenId: "00000000-0000-4000-8000-000000000003",
    verificationTokenId: null,
    emailVersion: 4,
    language: "en" as const,
    ...{
      payloadCiphertext: encrypted.ciphertext,
      payloadNonce: encrypted.nonce,
      payloadTag: encrypted.tag,
      keyVersion: encrypted.keyVersion,
    },
    leaseId: "00000000-0000-4000-8000-000000000004",
    attemptCount: 1,
    expiresAt: new Date(Date.now() + 60_000),
  };
  const sql: string[] = [];
  let rowClaimed = false;
  const manager = {
    query: vi.fn(async (statement: string, parameters?: unknown[]) => {
      sql.push(`${statement} ${JSON.stringify(parameters ?? [])}`);
      if (statement.includes("WITH candidate")) {
        if (rowClaimed) return [];
        rowClaimed = true;
        return [row];
      }
      if (statement.includes('RETURNING "id"')) return [{ id: outboxId }];
      return [];
    }),
  };
  const user = {
    id: userId,
    email: "parent@example.test",
    emailVersion: options?.emailVersion ?? 4,
    status: UserStatus.ACTIVE,
  };
  const repository = (entity: unknown) => {
    if (entity === User) return { findOne: vi.fn(async () => user) };
    if (entity === PasswordResetToken) {
      return {
        findOne: vi.fn(async () => ({
          id: row.resetTokenId,
          userId,
          emailVersion: 4,
          expiresAt: new Date(Date.now() + 60_000),
          usedAt: null,
        })),
      };
    }
    throw new Error("Unexpected repository");
  };
  const dataSource = {
    transaction: vi.fn(
      async (callback: (tx: typeof manager) => Promise<unknown>) =>
        callback(manager),
    ),
    query: vi.fn(async (statement: string, parameters?: unknown[]) => {
      sql.push(`${statement} ${JSON.stringify(parameters ?? [])}`);
      return [];
    }),
    getRepository: vi.fn(repository),
  } as unknown as DataSource;
  const audit = {
    recordEvent: vi.fn(async () => ({})),
  } as unknown as AuditService;
  const mail = options?.sendError
    ? {
        send: vi.fn(async () => {
          throw options.sendError;
        }),
      }
    : new AuthMailService(config);
  const service = new EmailOutboxService(
    dataSource,
    cryptoService,
    mail as AuthMailService,
    config,
    audit,
  );
  return {
    service,
    mail,
    row,
    sql,
    manager,
    token,
    dataSource,
    cryptoService,
    config,
    audit,
  };
}

describe("EmailOutboxService", () => {
  it("claims with skip-locked leases and sends only when the email version matches", async () => {
    const h = harness();
    await (
      h.service as unknown as { dispatchCycle(): Promise<void> }
    ).dispatchCycle();
    const claim =
      h.sql.find((statement) => statement.includes("WITH candidate")) ?? "";
    expect(claim).toContain("FOR UPDATE SKIP LOCKED");
    expect(claim).toContain("leaseExpiresAt");
    const messages = (h.mail as AuthMailService).drainTestMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].link).toContain("/reset-password#");
    expect(messages[0].link).toContain(h.token);
    expect(
      h.sql.some((statement) => statement.includes('"payloadCiphertext"=NULL')),
    ).toBe(true);
  });

  it("expires queued mail when the account email version has changed", async () => {
    const h = harness({ emailVersion: 5 });
    await (
      h.service as unknown as { dispatchCycle(): Promise<void> }
    ).dispatchCycle();
    expect((h.mail as AuthMailService).drainTestMessages()).toHaveLength(0);
    expect(
      h.sql.some((statement) => statement.includes("account_or_email_changed")),
    ).toBe(true);
  });

  it("bounds retry attempts and schedules a transient failure for retry", async () => {
    const h = harness({
      sendError: Object.assign(new Error("network"), { retryable: true }),
    });
    await (
      h.service as unknown as { dispatchCycle(): Promise<void> }
    ).dispatchCycle();
    expect(
      h.sql.some((statement) => statement.includes("SET \"status\"='QUEUED'")),
    ).toBe(true);
    expect(
      h.sql.find((statement) => statement.includes("WITH candidate")),
    ).toContain("attemptCount");
  });

  it("reclaims abandoned processing rows after their lease and caps attempts", async () => {
    const h = harness();
    await (
      h.service as unknown as { dispatchCycle(): Promise<void> }
    ).dispatchCycle();
    const claim =
      h.sql.find((statement) => statement.includes("WITH candidate")) ?? "";
    expect(claim).toContain(
      '"status" = \'PROCESSING\' AND "leaseExpiresAt" <= now()',
    );
    expect(h.sql.some((statement) => statement.includes("attempt_limit"))).toBe(
      true,
    );
  });

  it("lets only one concurrent worker claim a row", async () => {
    const h = harness();
    const secondWorker = new EmailOutboxService(
      h.dataSource,
      h.cryptoService,
      h.mail as AuthMailService,
      h.config,
      h.audit,
    );
    await Promise.all([
      (
        h.service as unknown as { dispatchCycle(): Promise<void> }
      ).dispatchCycle(),
      (
        secondWorker as unknown as { dispatchCycle(): Promise<void> }
      ).dispatchCycle(),
    ]);
    expect((h.mail as AuthMailService).drainTestMessages()).toHaveLength(1);
  });
});
