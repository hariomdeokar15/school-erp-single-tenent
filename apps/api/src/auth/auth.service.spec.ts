import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { DataSource } from "typeorm";
import { AuthService } from "./auth.service";
import { User, UserStatus } from "./entities/user.entity";
import { AuthSession } from "./entities/auth-session.entity";
import { PasswordResetToken } from "./entities/password-reset-token.entity";
import { EmailOutboxService } from "./email-outbox.service";
import { AuthRateLimitService } from "./auth-rate-limit.service";
import { AuditService } from "../audit/services/audit.service";

vi.mock("argon2", () => ({
  argon2id: 2,
  hash: vi.fn(async () => "new-argon2id-hash"),
  verify: vi.fn(async () => true),
}));

function fixture() {
  const user = {
    id: "user-id",
    email: "parent@example.test",
    emailVersion: 1,
    emailVerifiedAt: new Date(),
    status: UserStatus.ACTIVE,
    mustChangePassword: true,
    roleAssignments: [{ role: "PARENT" }],
  } as User;
  const token = {
    id: "reset-id",
    userId: user.id,
    tokenHash: "",
    emailVersion: 1,
    language: "en" as const,
    expiresAt: new Date(Date.now() + 60_000),
    usedAt: null as Date | null,
  } as PasswordResetToken;
  const updates: Array<{ user: string; values: Record<string, unknown> }> = [];
  let transactionTail = Promise.resolve();

  const tokenRepo = {
    findOne: vi.fn(async () => ({ id: token.id, userId: token.userId })),
    createQueryBuilder: vi.fn(() => ({
      where: () => ({ setLock: () => ({ getOne: async () => token }) }),
    })),
    save: vi.fn(async (value: PasswordResetToken) => {
      token.usedAt = value.usedAt;
      return value;
    }),
    update: vi.fn(async () => ({ affected: 1 })),
  };
  const userRepo = {
    createQueryBuilder: vi.fn(() => ({
      where: () => ({ setLock: () => ({ getOne: async () => user }) }),
    })),
    update: vi.fn(async (id: string, values: Record<string, unknown>) => {
      updates.push({ user: id, values });
      return { affected: 1 };
    }),
  };
  const sessionRepo = { update: vi.fn(async () => ({ affected: 2 })) };
  const manager = {
    getRepository: (entity: unknown) => {
      if (entity === User) return userRepo;
      if (entity === PasswordResetToken) return tokenRepo;
      if (entity === AuthSession) return sessionRepo;
      throw new Error("Unexpected repository");
    },
    query: vi.fn(async () => []),
  };
  const dataSource = {
    transaction: vi.fn(
      async (callback: (tx: typeof manager) => Promise<unknown>) => {
        const previous = transactionTail;
        let release!: () => void;
        transactionTail = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
        try {
          return await callback(manager);
        } finally {
          release();
        }
      },
    ),
  } as unknown as DataSource;
  const audit = {
    recordEvent: vi.fn(async () => ({})),
  } as unknown as AuditService;
  const rateLimit = {
    checkResetRedemption: vi.fn(async () => undefined),
  } as unknown as AuthRateLimitService;
  const emailOutbox = {
    enqueueCompletion: vi.fn(async () => undefined),
  } as unknown as EmailOutboxService;
  const config = new ConfigService({
    auth: {
      privateKey: "<GENERATED_IN_SECRET_MANAGER>",
      publicKey: "<GENERATED_IN_SECRET_MANAGER>",
      resetTokenTtlMinutes: 15,
    },
    environment: "test",
  });
  const service = new AuthService(
    {} as never,
    {} as never,
    dataSource,
    {} as JwtService,
    config,
    audit,
    rateLimit,
    emailOutbox,
  );
  return {
    service,
    user,
    token,
    updates,
    tokenRepo,
    userRepo,
    sessionRepo,
    manager,
    audit,
    emailOutbox,
  };
}

describe("AuthService password recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("changes only the password flag/hash, revokes sessions, and enqueues completion transactionally", async () => {
    const h = fixture();
    const rawToken = "A".repeat(43);
    const { createHash } = await import("crypto");
    h.token.tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await h.service.resetPassword(
      rawToken,
      "A-strong-new-password",
      "127.0.0.1",
    );

    expect(h.updates).toEqual([
      {
        user: h.user.id,
        values: {
          passwordHash: "new-argon2id-hash",
          mustChangePassword: false,
        },
      },
    ]);
    expect(h.sessionRepo.update).toHaveBeenCalledOnce();
    expect(h.token.usedAt).toBeInstanceOf(Date);
    expect(h.emailOutbox.enqueueCompletion).toHaveBeenCalledOnce();
    expect(h.audit.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.password.reset.succeeded" }),
      h.manager,
    );
  });

  it("allows only one concurrent redemption of the same reset link", async () => {
    const h = fixture();
    const rawToken = "B".repeat(43);
    const { createHash } = await import("crypto");
    h.token.tokenHash = createHash("sha256").update(rawToken).digest("hex");

    const results = await Promise.allSettled([
      h.service.resetPassword(rawToken, "first-password-123", "127.0.0.1"),
      h.service.resetPassword(rawToken, "second-password-456", "127.0.0.1"),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(h.updates).toHaveLength(1);
    expect(h.sessionRepo.update).toHaveBeenCalledOnce();
  });
});
