import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";
import { DataSource, Logger as TypeOrmLogger } from "typeorm";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { AuditService } from "../src/audit/services/audit.service";
import { AuthMailService } from "../src/auth/auth-mail.service";
import { EmailOutboxCryptoService } from "../src/auth/email-outbox-crypto.service";
import { EmailOutboxService } from "../src/auth/email-outbox.service";
import {
  EmailOutbox,
  EmailOutboxKind,
  EmailOutboxStatus,
} from "../src/auth/entities/email-outbox.entity";
import { AuthSession } from "../src/auth/entities/auth-session.entity";
import { EmailVerificationToken } from "../src/auth/entities/email-verification-token.entity";
import { PasswordResetToken } from "../src/auth/entities/password-reset-token.entity";
import { RoleAssignment } from "../src/auth/entities/role-assignment.entity";
import { User, UserStatus } from "../src/auth/entities/user.entity";

const databaseUrl = process.env.EMAIL_OUTBOX_TEST_DATABASE_URL;
const testDatabaseName = "schoolerp_outbox_test";

class QueryCaptureLogger implements TypeOrmLogger {
  readonly queries: Array<{ query: string; parameters?: unknown[] }> = [];
  readonly errors: string[] = [];

  logQuery(query: string, parameters?: unknown[]) {
    this.queries.push({ query, parameters });
  }
  logQueryError(error: string | Error) {
    this.errors.push(error instanceof Error ? error.message : error);
  }
  logQuerySlow() {}
  logSchemaBuild() {}
  logMigration() {}
  log() {}
}

describe.skipIf(!databaseUrl)(
  "EmailOutboxService PostgreSQL integration",
  () => {
    let dataSource: DataSource;
    let logger: QueryCaptureLogger;
    let crypto: EmailOutboxCryptoService;
    let mail: AuthMailService;
    let service: EmailOutboxService;
    const createdUserIds: string[] = [];
    const key = Buffer.alloc(32, 23).toString("base64");

    beforeAll(async () => {
      const url = new URL(databaseUrl!);
      if (
        !["localhost", "127.0.0.1", "::1"].includes(url.hostname) ||
        url.pathname !== `/${testDatabaseName}`
      ) {
        throw new Error(
          `Integration tests require localhost database ${testDatabaseName}; refusing ${url.hostname}${url.pathname}`,
        );
      }
      logger = new QueryCaptureLogger();
      dataSource = new DataSource({
        type: "postgres",
        url: databaseUrl,
        entities: [
          User,
          RoleAssignment,
          AuthSession,
          EmailOutbox,
          PasswordResetToken,
          EmailVerificationToken,
        ],
        synchronize: false,
        logging: ["query"],
        logger,
      });
      await dataSource.initialize();
      const config = new ConfigService({
        email: {
          outboxKeys: JSON.stringify({ "test-v1": key }),
          outboxActiveKeyVersion: "test-v1",
          transport: "test",
          frontendOrigin: "http://localhost:3001",
        },
        environment: "test",
      });
      crypto = new EmailOutboxCryptoService(config);
      mail = new AuthMailService(config);
      service = new EmailOutboxService(dataSource, crypto, mail, config, {
        recordEvent: vi.fn(async () => undefined),
      } as unknown as AuditService);
    }, 30_000);

    afterEach(async () => {
      for (const userId of createdUserIds.splice(0)) {
        await dataSource.getRepository(User).delete(userId);
      }
      mail?.drainTestMessages();
      logger?.queries.splice(0);
      logger?.errors.splice(0);
    });

    afterAll(async () => {
      if (dataSource?.isInitialized) await dataSource.destroy();
    });

    async function createUser() {
      const user = await dataSource.getRepository(User).save(
        dataSource.getRepository(User).create({
          email: `${randomUUID()}@example.test`,
          displayName: "Outbox Integration Test",
          passwordHash: "not-used-by-this-test",
          status: UserStatus.ACTIVE,
          mustChangePassword: false,
          emailVersion: 1,
          emailVerifiedAt: new Date(),
        }),
      );
      createdUserIds.push(user.id);
      return user;
    }

    async function enqueueCompletion(userId: string) {
      const id = randomUUID();
      const encrypted = crypto.encrypt(
        id,
        userId,
        EmailOutboxKind.PASSWORD_RESET_COMPLETE,
        1,
        "password-reset-complete",
      );
      return dataSource.getRepository(EmailOutbox).save(
        dataSource.getRepository(EmailOutbox).create({
          id,
          userId,
          kind: EmailOutboxKind.PASSWORD_RESET_COMPLETE,
          resetTokenId: null,
          verificationTokenId: null,
          emailVersion: 1,
          language: "en",
          payloadCiphertext: encrypted.ciphertext,
          payloadNonce: encrypted.nonce,
          payloadTag: encrypted.tag,
          keyVersion: encrypted.keyVersion,
          status: EmailOutboxStatus.QUEUED,
          attemptCount: 0,
          availableAt: new Date(Date.now() - 1_000),
          leaseId: null,
          leaseExpiresAt: null,
          expiresAt: new Date(Date.now() + 60 * 60_000),
          acceptedAt: null,
          lastErrorCode: null,
        }),
      );
    }

    async function dispatchOnce() {
      await (
        service as unknown as { dispatchCycle(): Promise<void> }
      ).dispatchCycle();
    }

    it("leaves an empty queue idle without entering delivery processing", async () => {
      await dispatchOnce();

      expect(logger.errors, logger.errors.join("\n")).toEqual([]);

      expect(mail.drainTestMessages()).toEqual([]);
      expect(
        logger.queries.some((entry) => entry.query.includes('FROM "users"')),
      ).toBe(false);
      const remaining = await dataSource.getRepository(EmailOutbox).count();
      expect(remaining).toBe(0);
    });

    it("maps the real claim row, scopes user lookup, and updates that row", async () => {
      const user = await createUser();
      const queued = await enqueueCompletion(user.id);
      const before = await dataSource.query(
        `SELECT "status", "availableAt", "expiresAt", "attemptCount" FROM "email_outbox" WHERE "id"=$1`,
        [queued.id],
      );
      expect(before[0]).toMatchObject({ status: "QUEUED", attemptCount: 0 });
      expect(new Date(before[0].availableAt).getTime()).toBeLessThan(
        Date.now(),
      );

      await dispatchOnce();

      expect(logger.errors, logger.errors.join("\n")).toEqual([]);
      expect(
        logger.queries.map((entry) => entry.query).join("\n---\n"),
      ).toContain("WITH candidate");

      const messages = mail.drainTestMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].recipient).toBe(user.email);
      const userLookup = logger.queries.find((entry) =>
        entry.query.includes('FROM "users"'),
      );
      expect(userLookup?.query).toMatch(/WHERE .*"id"\s*=\s*\$1/i);
      expect(userLookup?.parameters).toContain(user.id);

      const delivered = await dataSource
        .getRepository(EmailOutbox)
        .findOneOrFail({ where: { id: queued.id } });
      const erasedPayload = await dataSource.query(
        `SELECT "payloadCiphertext", "payloadNonce", "payloadTag", "keyVersion" FROM "email_outbox" WHERE "id"=$1`,
        [queued.id],
      );
      expect(delivered.status).toBe(EmailOutboxStatus.ACCEPTED);
      expect(delivered.leaseId).toBeNull();
      expect(erasedPayload[0]).toEqual({
        payloadCiphertext: null,
        payloadNonce: null,
        payloadTag: null,
        keyVersion: null,
      });
      expect(delivered.acceptedAt).toBeInstanceOf(Date);
      const finish = logger.queries.find((entry) =>
        entry.query.includes('"acceptedAt"=CASE WHEN $5::boolean'),
      );
      expect(finish?.parameters).toEqual([
        EmailOutboxStatus.ACCEPTED,
        null,
        queued.id,
        expect.any(String),
        true,
      ]);
    });

    it("applies retry backoff and permanently stops after the configured attempt limit", async () => {
      const user = await createUser();
      const queued = await enqueueCompletion(user.id);
      const failingMail = {
        send: vi.fn(async () => {
          throw Object.assign(new Error("temporary provider failure"), {
            retryable: true,
          });
        }),
      } as unknown as AuthMailService;
      const retryService = new EmailOutboxService(
        dataSource,
        crypto,
        failingMail,
        new ConfigService({
          email: { frontendOrigin: "http://localhost:3001" },
        }),
        {
          recordEvent: vi.fn(async () => undefined),
        } as unknown as AuditService,
      );

      for (
        let expectedAttempt = 1;
        expectedAttempt <= 5;
        expectedAttempt += 1
      ) {
        await (
          retryService as unknown as { dispatchCycle(): Promise<void> }
        ).dispatchCycle();
        const current = await dataSource
          .getRepository(EmailOutbox)
          .findOneOrFail({ where: { id: queued.id } });
        expect(current.attemptCount).toBe(expectedAttempt);
        if (expectedAttempt < 5) {
          expect(current.status).toBe(EmailOutboxStatus.QUEUED);
          expect(current.availableAt.getTime()).toBeGreaterThan(Date.now());
          await dataSource.query(
            `UPDATE "email_outbox" SET "availableAt"=now()-interval '1 second' WHERE "id"=$1`,
            [queued.id],
          );
        } else {
          expect(current.status).toBe(EmailOutboxStatus.FAILED);
          expect(current.lastErrorCode).toBe("delivery_failed");
          expect(current.leaseId).toBeNull();
          const erasedPayload = await dataSource.query(
            `SELECT "payloadCiphertext", "payloadNonce", "payloadTag", "keyVersion" FROM "email_outbox" WHERE "id"=$1`,
            [queued.id],
          );
          expect(erasedPayload[0]).toEqual({
            payloadCiphertext: null,
            payloadNonce: null,
            payloadTag: null,
            keyVersion: null,
          });
        }
      }

      expect(failingMail.send).toHaveBeenCalledTimes(5);
      await dispatchOnce();
      const failed = await dataSource
        .getRepository(EmailOutbox)
        .findOneOrFail({ where: { id: queued.id } });
      expect(failed.attemptCount).toBe(5);
      expect(failingMail.send).toHaveBeenCalledTimes(5);
    });
  },
);
