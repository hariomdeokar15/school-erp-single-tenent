import { MigrationInterface, QueryRunner } from "typeorm";

export class AppendOnlyAuditEvents2026100900000 implements MigrationInterface {
  name = "AppendOnlyAuditEvents2026100900000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION reject_audit_event_mutation()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RAISE EXCEPTION 'audit_events is append-only'
          USING ERRCODE = '55000';
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE TRIGGER "TR_audit_events_append_only"
      BEFORE UPDATE OR DELETE ON "audit_events"
      FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TR_audit_events_append_only" ON "audit_events";`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS reject_audit_event_mutation();`,
    );
  }
}
