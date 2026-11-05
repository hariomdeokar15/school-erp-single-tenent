import { MigrationInterface, QueryRunner } from "typeorm";

export class AuthenticationAndSessions2026101800000 implements MigrationInterface {
  name = "AuthenticationAndSessions2026101800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "users_status" AS ENUM ('ACTIVE', 'DISABLED')`,
    );
    await queryRunner.query(`CREATE TYPE "user_role" AS ENUM (
      'OWNER', 'PRINCIPAL', 'ADMIN', 'ADMISSIONS_OFFICER', 'ACCOUNTANT',
      'TEACHER', 'PARENT', 'STUDENT', 'TRANSPORT_MANAGER'
    )`);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(320) NOT NULL,
        "displayName" character varying(120) NOT NULL,
        "passwordHash" character varying(255) NOT NULL,
        "status" "users_status" NOT NULL DEFAULT 'ACTIVE',
        "mustChangePassword" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "role_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "role" "user_role" NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_role_assignments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_role_assignments_user_role" UNIQUE ("userId", "role"),
        CONSTRAINT "FK_role_assignments_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "auth_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "refreshTokenHash" character(64) NOT NULL,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "revokedAt" TIMESTAMPTZ,
        "ipAddress" character varying(45),
        "userAgent" character varying(512),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_auth_sessions_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_auth_sessions_user_active"
      ON "auth_sessions" ("userId", "revokedAt", "expiresAt")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth_sessions"`);
    await queryRunner.query(`DROP TABLE "role_assignments"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "user_role"`);
    await queryRunner.query(`DROP TYPE "users_status"`);
  }
}
