import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigrationInfrastructure1700000000000 implements MigrationInterface {
  name = "InitialMigrationInfrastructure1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid extension if available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Create AuditEvent infrastructure table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actorId" character varying(255),
        "actorRole" character varying(50),
        "action" character varying(100) NOT NULL,
        "entityName" character varying(100),
        "entityId" character varying(255),
        "ipAddress" character varying(45),
        "userAgent" character varying(512),
        "correlationId" character varying(255),
        "metadata" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_events_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_events_actorId" ON "audit_events" ("actorId");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_events_action" ON "audit_events" ("action");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_events_correlationId" ON "audit_events" ("correlationId");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_events";`);
  }
}
