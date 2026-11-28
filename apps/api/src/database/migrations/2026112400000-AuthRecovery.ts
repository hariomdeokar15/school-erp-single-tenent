import { MigrationInterface, QueryRunner } from "typeorm";

export class AuthRecovery2026112400000 implements MigrationInterface {
  name = "AuthRecovery2026112400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users"
      ADD COLUMN "emailVersion" integer NOT NULL DEFAULT 1,
      ADD COLUMN "emailVerifiedAt" TIMESTAMPTZ NULL`);
    await queryRunner.query(`CREATE FUNCTION invalidate_email_verification()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW."email" IS DISTINCT FROM OLD."email" THEN
          NEW."emailVersion" := OLD."emailVersion" + 1;
          NEW."emailVerifiedAt" := NULL;
          UPDATE "email_verification_tokens" SET "usedAt" = now()
            WHERE "userId" = OLD."id" AND "usedAt" IS NULL;
          UPDATE "password_reset_tokens" SET "usedAt" = now()
            WHERE "userId" = OLD."id" AND "usedAt" IS NULL;
          UPDATE "email_outbox" SET "status" = 'EXPIRED',
            "payloadCiphertext" = NULL, "payloadNonce" = NULL, "payloadTag" = NULL,
            "keyVersion" = NULL, "leaseId" = NULL, "leaseExpiresAt" = NULL,
            "lastErrorCode" = 'account_email_changed'
            WHERE "userId" = OLD."id" AND "status" IN ('QUEUED', 'PROCESSING')
              AND "kind" IN ('VERIFY_EMAIL', 'PASSWORD_RESET');
        END IF;
        RETURN NEW;
      END;
      $$`);
    await queryRunner.query(`CREATE TRIGGER "TR_users_email_changed"
      BEFORE UPDATE OF "email" ON "users"
      FOR EACH ROW EXECUTE FUNCTION invalidate_email_verification()`);

    await queryRunner.query(`CREATE TABLE "email_verification_tokens" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "userId" uuid NOT NULL,
      "tokenHash" character(64) NOT NULL,
      "emailVersion" integer NOT NULL,
      "language" varchar(2) NOT NULL DEFAULT 'en',
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "usedAt" TIMESTAMPTZ NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "PK_email_verification_tokens" PRIMARY KEY ("id"),
      CONSTRAINT "FK_email_verification_tokens_user" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "UQ_email_verification_tokens_hash" UNIQUE ("tokenHash"),
      CONSTRAINT "CK_email_verification_tokens_language" CHECK ("language" IN ('en','hi','mr'))
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_email_verification_tokens_user"
      ON "email_verification_tokens" ("userId", "expiresAt")`);

    await queryRunner.query(`CREATE TABLE "password_reset_tokens" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "userId" uuid NOT NULL,
      "tokenHash" character(64) NOT NULL,
      "emailVersion" integer NOT NULL,
      "language" varchar(2) NOT NULL DEFAULT 'en',
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "usedAt" TIMESTAMPTZ NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id"),
      CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "UQ_password_reset_tokens_hash" UNIQUE ("tokenHash"),
      CONSTRAINT "CK_password_reset_tokens_language" CHECK ("language" IN ('en','hi','mr'))
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_password_reset_tokens_user"
      ON "password_reset_tokens" ("userId", "expiresAt")`);

    await queryRunner.query(`CREATE TYPE "email_outbox_kind" AS ENUM (
      'VERIFY_EMAIL', 'PASSWORD_RESET', 'PASSWORD_RESET_COMPLETE')`);
    await queryRunner.query(`CREATE TYPE "email_outbox_status" AS ENUM (
      'QUEUED', 'PROCESSING', 'ACCEPTED', 'FAILED', 'EXPIRED')`);
    await queryRunner.query(`CREATE TABLE "email_outbox" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "userId" uuid NOT NULL,
      "kind" "email_outbox_kind" NOT NULL,
      "resetTokenId" uuid NULL,
      "verificationTokenId" uuid NULL,
      "emailVersion" integer NOT NULL,
      "language" varchar(2) NOT NULL DEFAULT 'en',
      "payloadCiphertext" bytea NULL,
      "payloadNonce" bytea NULL,
      "payloadTag" bytea NULL,
      "keyVersion" varchar(32) NULL,
      "status" "email_outbox_status" NOT NULL DEFAULT 'QUEUED',
      "attemptCount" integer NOT NULL DEFAULT 0,
      "availableAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "leaseExpiresAt" TIMESTAMPTZ NULL,
      "leaseId" uuid NULL,
      "expiresAt" TIMESTAMPTZ NULL,
      "acceptedAt" TIMESTAMPTZ NULL,
      "lastErrorCode" varchar(64) NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "PK_email_outbox" PRIMARY KEY ("id"),
      CONSTRAINT "FK_email_outbox_user" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_email_outbox_reset_token" FOREIGN KEY ("resetTokenId")
        REFERENCES "password_reset_tokens"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_email_outbox_verify_token" FOREIGN KEY ("verificationTokenId")
        REFERENCES "email_verification_tokens"("id") ON DELETE CASCADE,
      CONSTRAINT "CK_email_outbox_token_reference" CHECK (
        ("kind" = 'PASSWORD_RESET' AND "resetTokenId" IS NOT NULL AND "verificationTokenId" IS NULL) OR
        ("kind" = 'VERIFY_EMAIL' AND "verificationTokenId" IS NOT NULL AND "resetTokenId" IS NULL) OR
        ("kind" = 'PASSWORD_RESET_COMPLETE' AND "resetTokenId" IS NULL AND "verificationTokenId" IS NULL)),
      CONSTRAINT "CK_email_outbox_payload_all_or_none" CHECK (
        ("payloadCiphertext" IS NULL AND "payloadNonce" IS NULL AND "payloadTag" IS NULL AND "keyVersion" IS NULL) OR
        ("payloadCiphertext" IS NOT NULL AND "payloadNonce" IS NOT NULL AND "payloadTag" IS NOT NULL AND "keyVersion" IS NOT NULL)),
      CONSTRAINT "CK_email_outbox_nonce_size" CHECK ("payloadNonce" IS NULL OR octet_length("payloadNonce") = 12),
      CONSTRAINT "CK_email_outbox_tag_size" CHECK ("payloadTag" IS NULL OR octet_length("payloadTag") = 16),
      CONSTRAINT "CK_email_outbox_attempt_nonnegative" CHECK ("attemptCount" >= 0),
      CONSTRAINT "CK_email_outbox_language" CHECK ("language" IN ('en','hi','mr'))
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_email_outbox_dispatch"
      ON "email_outbox" ("status", "availableAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_email_outbox_user_created"
      ON "email_outbox" ("userId", "createdAt")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_outbox"`);
    await queryRunner.query(`DROP TYPE "email_outbox_status"`);
    await queryRunner.query(`DROP TYPE "email_outbox_kind"`);
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    await queryRunner.query(`DROP TABLE "email_verification_tokens"`);
    await queryRunner.query(`DROP TRIGGER "TR_users_email_changed" ON "users"`);
    await queryRunner.query(`DROP FUNCTION invalidate_email_verification()`);
    await queryRunner.query(`ALTER TABLE "users"
      DROP COLUMN "emailVerifiedAt", DROP COLUMN "emailVersion"`);
  }
}
