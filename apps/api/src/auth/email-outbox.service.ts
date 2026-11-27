import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource, EntityManager, IsNull } from "typeorm";
import { randomUUID } from "crypto";
import { AuthMailService } from "./auth-mail.service";
import {
  EmailOutbox,
  EmailOutboxKind,
  EmailOutboxStatus,
} from "./entities/email-outbox.entity";
import { User, UserStatus } from "./entities/user.entity";
import { PasswordResetToken } from "./entities/password-reset-token.entity";
import { EmailVerificationToken } from "./entities/email-verification-token.entity";
import { AuditService } from "../audit/services/audit.service";
import { SupportedLanguage } from "@schoolerp/i18n";
import { EmailOutboxCryptoService } from "./email-outbox-crypto.service";

interface ClaimedRow {
  id: string;
  userId: string;
  kind: EmailOutboxKind;
  resetTokenId: string | null;
  verificationTokenId: string | null;
  emailVersion: number;
  language: SupportedLanguage;
  payloadCiphertext: Buffer | null;
  payloadNonce: Buffer | null;
  payloadTag: Buffer | null;
  keyVersion: string | null;
  leaseId: string;
  attemptCount: number;
  expiresAt: Date | null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function returnedRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error("Email outbox update returned an invalid result set");
  }
  // TypeORM's PostgreSQL query runner wraps UPDATE ... RETURNING as
  // [rows, rowCount]; SELECT queries return the rows directly.
  const rows =
    value.length === 2 &&
    Array.isArray(value[0]) &&
    typeof value[1] === "number"
      ? value[0]
      : value;
  if (
    !rows.every(
      (row) => row !== null && typeof row === "object" && !Array.isArray(row),
    )
  ) {
    throw new Error("Email outbox update returned malformed rows");
  }
  return rows as Record<string, unknown>[];
}

function mapClaimedRow(value: unknown): ClaimedRow | undefined {
  const raw = returnedRows(value)[0];
  if (!raw) return undefined;

  const requiredUuid = (field: string): string => {
    const candidate = raw[field];
    if (typeof candidate !== "string" || !UUID_PATTERN.test(candidate)) {
      throw new Error(`Email outbox claim returned an invalid ${field}`);
    }
    return candidate;
  };
  const nullableBuffer = (field: string): Buffer | null => {
    const candidate = raw[field];
    if (candidate === null || candidate === undefined) return null;
    if (!Buffer.isBuffer(candidate)) {
      throw new Error(`Email outbox claim returned an invalid ${field}`);
    }
    return candidate;
  };
  const nullableUuid = (field: string): string | null => {
    const candidate = raw[field];
    if (candidate === null || candidate === undefined) return null;
    if (typeof candidate !== "string" || !UUID_PATTERN.test(candidate)) {
      throw new Error(`Email outbox claim returned an invalid ${field}`);
    }
    return candidate;
  };

  const kind = raw.kind;
  if (!Object.values(EmailOutboxKind).includes(kind as EmailOutboxKind)) {
    throw new Error(
      `Email outbox claim returned invalid kind metadata (${Object.keys(raw).join(",")})`,
    );
  }
  const language = raw.language;
  if (language !== "en" && language !== "hi" && language !== "mr") {
    throw new Error("Email outbox claim returned an invalid language");
  }
  const emailVersion = Number(raw.emailVersion);
  const attemptCount = Number(raw.attemptCount);
  if (!Number.isInteger(emailVersion) || emailVersion < 1) {
    throw new Error("Email outbox claim returned an invalid email version");
  }
  if (!Number.isInteger(attemptCount) || attemptCount < 1) {
    throw new Error("Email outbox claim returned an invalid attempt count");
  }
  const expiresAt = raw.expiresAt;
  if (
    expiresAt !== null &&
    expiresAt !== undefined &&
    !(expiresAt instanceof Date) &&
    typeof expiresAt !== "string"
  ) {
    throw new Error("Email outbox claim returned an invalid expiry");
  }
  const parsedExpiry = expiresAt
    ? expiresAt instanceof Date
      ? expiresAt
      : new Date(expiresAt)
    : null;
  if (parsedExpiry && Number.isNaN(parsedExpiry.getTime())) {
    throw new Error("Email outbox claim returned an invalid expiry");
  }

  return {
    id: requiredUuid("id"),
    userId: requiredUuid("userId"),
    kind: kind as EmailOutboxKind,
    resetTokenId: nullableUuid("resetTokenId"),
    verificationTokenId: nullableUuid("verificationTokenId"),
    emailVersion,
    language,
    payloadCiphertext: nullableBuffer("payloadCiphertext"),
    payloadNonce: nullableBuffer("payloadNonce"),
    payloadTag: nullableBuffer("payloadTag"),
    keyVersion: (() => {
      if (raw.keyVersion === null || raw.keyVersion === undefined) return null;
      if (typeof raw.keyVersion !== "string") {
        throw new Error("Email outbox claim returned an invalid key version");
      }
      return raw.keyVersion;
    })(),
    leaseId: requiredUuid("leaseId"),
    attemptCount,
    expiresAt: parsedExpiry,
  };
}

@Injectable()
export class EmailOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailOutboxService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly maxAttempts = 5;
  private readonly leaseSeconds = 90;

  constructor(
    private readonly dataSource: DataSource,
    private readonly crypto: EmailOutboxCryptoService,
    private readonly mail: AuthMailService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.dispatchCycle(), 2_000);
    this.timer.unref();
    void this.dispatchCycle();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async enqueueLink(
    manager: EntityManager,
    input: {
      userId: string;
      kind: EmailOutboxKind.VERIFY_EMAIL | EmailOutboxKind.PASSWORD_RESET;
      tokenId: string;
      emailVersion: number;
      language: SupportedLanguage;
      token: string;
      expiresAt: Date;
    },
  ): Promise<void> {
    const id = randomUUID();
    const encrypted = this.crypto.encrypt(
      id,
      input.userId,
      input.kind,
      input.emailVersion,
      input.token,
    );
    const row = manager.getRepository(EmailOutbox).create({
      id,
      userId: input.userId,
      kind: input.kind,
      resetTokenId:
        input.kind === EmailOutboxKind.PASSWORD_RESET ? input.tokenId : null,
      verificationTokenId:
        input.kind === EmailOutboxKind.VERIFY_EMAIL ? input.tokenId : null,
      emailVersion: input.emailVersion,
      language: input.language,
      payloadCiphertext: encrypted.ciphertext,
      payloadNonce: encrypted.nonce,
      payloadTag: encrypted.tag,
      keyVersion: encrypted.keyVersion,
      expiresAt: input.expiresAt,
      status: EmailOutboxStatus.QUEUED,
    });
    await manager.getRepository(EmailOutbox).save(row);
  }

  async enqueueCompletion(
    manager: EntityManager,
    user: Pick<User, "id" | "emailVersion">,
    language: SupportedLanguage,
  ): Promise<void> {
    const id = randomUUID();
    const encrypted = this.crypto.encrypt(
      id,
      user.id,
      EmailOutboxKind.PASSWORD_RESET_COMPLETE,
      user.emailVersion,
      "password-reset-complete",
    );
    await manager.getRepository(EmailOutbox).save(
      manager.getRepository(EmailOutbox).create({
        id,
        userId: user.id,
        kind: EmailOutboxKind.PASSWORD_RESET_COMPLETE,
        resetTokenId: null,
        verificationTokenId: null,
        emailVersion: user.emailVersion,
        language,
        payloadCiphertext: encrypted.ciphertext,
        payloadNonce: encrypted.nonce,
        payloadTag: encrypted.tag,
        keyVersion: encrypted.keyVersion,
        // Completion notices contain no token; expire after 24 hours.
        expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
        status: EmailOutboxStatus.QUEUED,
      }),
    );
  }

  private async dispatchCycle(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.cleanup();
      for (let count = 0; count < 10; count += 1) {
        const row = await this.claim();
        if (!row) break;
        await this.process(row);
      }
    } catch (error) {
      // Keep the failure reason actionable without logging provider details,
      // recipients, raw tokens, SQL parameters, or decrypted payloads.
      const reason =
        error instanceof Error ? error.message.slice(0, 180) : "unknown error";
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code).slice(0, 32)
          : undefined;
      this.logger.warn(
        `Auth email outbox polling failed; pending rows will be retried. ${code ? `[${code}] ` : ""}${reason}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async claim(): Promise<ClaimedRow | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const result = await manager.query(
        `WITH candidate AS (
          SELECT "id" FROM "email_outbox"
          WHERE (("status" = 'QUEUED' AND "availableAt" <= now()) OR
                 ("status" = 'PROCESSING' AND "leaseExpiresAt" <= now()))
            AND ("expiresAt" IS NULL OR "expiresAt" > now())
            AND "attemptCount" < $1::integer
          ORDER BY "availableAt", "createdAt"
          LIMIT 1 FOR UPDATE SKIP LOCKED
        )
        UPDATE "email_outbox" AS outbox
        SET "status" = 'PROCESSING', "leaseId" = $2::uuid,
            "leaseExpiresAt" = now() + ($3::integer * interval '1 second'),
            "attemptCount" = outbox."attemptCount" + 1
        FROM candidate WHERE outbox."id" = candidate."id"
        RETURNING
          outbox."id" AS "id",
          outbox."userId" AS "userId",
          outbox."kind" AS "kind",
          outbox."resetTokenId" AS "resetTokenId",
          outbox."verificationTokenId" AS "verificationTokenId",
          outbox."emailVersion" AS "emailVersion",
          outbox."language" AS "language",
          outbox."payloadCiphertext" AS "payloadCiphertext",
          outbox."payloadNonce" AS "payloadNonce",
          outbox."payloadTag" AS "payloadTag",
          outbox."keyVersion" AS "keyVersion",
          outbox."leaseId" AS "leaseId",
          outbox."attemptCount" AS "attemptCount",
          outbox."expiresAt" AS "expiresAt"`,
        [this.maxAttempts, randomUUID(), this.leaseSeconds],
      );
      // Decode and validate the raw driver rows inside the transaction. An
      // unexpected shape rolls back the claim instead of processing an empty
      // identity or issuing unscoped user queries.
      return mapClaimedRow(result);
    });
  }

  private async process(row: ClaimedRow): Promise<void> {
    try {
      const user = await this.dataSource.getRepository(User).findOne({
        where: { id: row.userId, emailVersion: row.emailVersion },
      });
      if (
        !user ||
        user.status !== UserStatus.ACTIVE ||
        user.emailVersion !== row.emailVersion
      ) {
        await this.finish(
          row,
          EmailOutboxStatus.EXPIRED,
          "account_or_email_changed",
        );
        return;
      }
      if (
        !row.payloadCiphertext ||
        !row.payloadNonce ||
        !row.payloadTag ||
        !row.keyVersion
      ) {
        await this.finish(row, EmailOutboxStatus.FAILED, "payload_unavailable");
        return;
      }
      if (row.kind === EmailOutboxKind.PASSWORD_RESET) {
        const token = row.resetTokenId
          ? await this.dataSource.getRepository(PasswordResetToken).findOne({
              where: {
                id: row.resetTokenId,
                userId: row.userId,
                emailVersion: row.emailVersion,
                usedAt: IsNull(),
              },
            })
          : null;
        if (!token || token.expiresAt.getTime() <= Date.now()) {
          await this.finish(
            row,
            EmailOutboxStatus.EXPIRED,
            "token_unavailable",
          );
          return;
        }
      }
      if (row.kind === EmailOutboxKind.VERIFY_EMAIL) {
        const token = row.verificationTokenId
          ? await this.dataSource
              .getRepository(EmailVerificationToken)
              .findOne({
                where: {
                  id: row.verificationTokenId,
                  userId: row.userId,
                  emailVersion: row.emailVersion,
                  usedAt: IsNull(),
                },
              })
          : null;
        if (!token || token.expiresAt.getTime() <= Date.now()) {
          await this.finish(
            row,
            EmailOutboxStatus.EXPIRED,
            "token_unavailable",
          );
          return;
        }
      }
      const token = this.crypto.decrypt(
        {
          ciphertext: row.payloadCiphertext,
          nonce: row.payloadNonce,
          tag: row.payloadTag,
          keyVersion: row.keyVersion,
        },
        row.id,
        row.userId,
        row.kind,
        row.emailVersion,
      );
      const page =
        row.kind === EmailOutboxKind.VERIFY_EMAIL
          ? "verify-email"
          : "reset-password";
      const link =
        row.kind === EmailOutboxKind.PASSWORD_RESET_COMPLETE
          ? undefined
          : `${this.config.get<string>("email.frontendOrigin")}/${page}#${encodeURIComponent(token)}`;
      await this.mail.send({
        kind: row.kind,
        recipient: user.email,
        link,
        language: row.language,
      });
      await this.finish(row, EmailOutboxStatus.ACCEPTED, null);
    } catch (error) {
      const retryable =
        (error as Error & { retryable?: boolean }).retryable !== false;
      const expiring = row.expiresAt && row.expiresAt.getTime() <= Date.now();
      if (!retryable || expiring || row.attemptCount >= this.maxAttempts) {
        await this.finish(
          row,
          expiring ? EmailOutboxStatus.EXPIRED : EmailOutboxStatus.FAILED,
          "delivery_failed",
        );
        return;
      }
      const delays = [5, 30, 120, 600];
      const delaySeconds =
        delays[Math.min(row.attemptCount - 1, delays.length - 1)];
      await this.dataSource.transaction(async (manager) => {
        const updated = returnedRows(
          await manager.query(
            `UPDATE "email_outbox" SET "status"='QUEUED', "leaseId"=NULL,
          "leaseExpiresAt"=NULL, "availableAt"=now()+($1::text || ' seconds')::interval,
          "lastErrorCode"='delivery_failed'
         WHERE "id"=$2 AND "leaseId"=$3 AND "status"='PROCESSING' RETURNING "id"`,
            [delaySeconds, row.id, row.leaseId],
          ),
        );
        if (updated.length) {
          await this.audit.recordEvent(
            {
              actorId: row.userId,
              action: "auth.email.delivery.retry_scheduled",
              entityName: "email_outbox",
              entityId: row.id,
              metadata: {
                kind: row.kind,
                errorCode: "delivery_failed",
                attempt: row.attemptCount,
              },
            },
            manager,
          );
        }
      });
    }
  }

  private async finish(
    row: ClaimedRow,
    status: EmailOutboxStatus,
    errorCode: string | null,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const updated = returnedRows(
        await manager.query(
          `UPDATE "email_outbox" SET "status"=$1, "acceptedAt"=CASE WHEN $5::boolean THEN now() ELSE NULL END,
        "payloadCiphertext"=NULL, "payloadNonce"=NULL, "payloadTag"=NULL, "keyVersion"=NULL,
        "leaseId"=NULL, "leaseExpiresAt"=NULL, "lastErrorCode"=$2
       WHERE "id"=$3 AND "leaseId"=$4 AND "status"='PROCESSING' RETURNING "id"`,
          [
            status,
            errorCode,
            row.id,
            row.leaseId,
            status === EmailOutboxStatus.ACCEPTED,
          ],
        ),
      );
      if (updated.length) {
        await this.audit.recordEvent(
          {
            actorId: row.userId,
            action:
              status === EmailOutboxStatus.ACCEPTED
                ? "auth.email.provider.accepted"
                : "auth.email.delivery.failed",
            entityName: "email_outbox",
            entityId: row.id,
            metadata: { kind: row.kind, status, errorCode },
          },
          manager,
        );
      }
    });
  }

  private async cleanup() {
    await this.dataSource.query(
      `UPDATE "email_outbox" SET "status"='FAILED', "payloadCiphertext"=NULL,
        "payloadNonce"=NULL, "payloadTag"=NULL, "keyVersion"=NULL,
        "leaseId"=NULL, "leaseExpiresAt"=NULL, "lastErrorCode"='attempt_limit'
       WHERE "attemptCount" >= $1::integer AND "status" IN ('QUEUED','PROCESSING')
         AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" <= now())`,
      [this.maxAttempts],
    );
    await this.dataSource.query(
      `UPDATE "email_outbox" SET "status"='EXPIRED', "payloadCiphertext"=NULL,
        "payloadNonce"=NULL, "payloadTag"=NULL, "keyVersion"=NULL,
        "leaseId"=NULL, "leaseExpiresAt"=NULL, "lastErrorCode"='token_expired'
       WHERE "status" IN ('QUEUED','PROCESSING') AND "expiresAt" IS NOT NULL AND "expiresAt" <= now()`,
    );
    await this.dataSource.query(
      `DELETE FROM "email_outbox" WHERE "status" IN ('ACCEPTED','FAILED','EXPIRED')
        AND "createdAt" < now() - interval '7 days'`,
    );
    await this.dataSource.query(
      `DELETE FROM "password_reset_tokens" WHERE "expiresAt" < now() - interval '30 days' OR "usedAt" < now() - interval '30 days'`,
    );
    await this.dataSource.query(
      `DELETE FROM "email_verification_tokens" WHERE "expiresAt" < now() - interval '30 days' OR "usedAt" < now() - interval '30 days'`,
    );
  }
}
