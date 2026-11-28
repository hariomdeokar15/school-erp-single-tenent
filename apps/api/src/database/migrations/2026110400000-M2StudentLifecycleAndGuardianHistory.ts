import { MigrationInterface, QueryRunner } from "typeorm";

export class M2StudentLifecycleAndGuardianHistory2026110400000 implements MigrationInterface {
  name = "M2StudentLifecycleAndGuardianHistory2026110400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_guardians" ADD COLUMN "endedAt" TIMESTAMPTZ`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_guardians" DROP CONSTRAINT "UQ_student_guardians_pair"`,
    );
    await queryRunner.query(`DROP INDEX "UQ_student_guardians_one_primary"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_student_guardians_pair"
      ON "student_guardians" ("studentId", "guardianId")
      WHERE "endedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_student_guardians_one_primary"
      ON "student_guardians" ("studentId")
      WHERE "isPrimaryContact" = true AND "endedAt" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM "student_guardians" WHERE "endedAt" IS NOT NULL
        ) THEN
          RAISE EXCEPTION 'Cannot roll back guardian history after relationships have ended; use a forward migration.';
        END IF;
      END $$;
    `);
    await queryRunner.query(`DROP INDEX "UQ_student_guardians_one_primary"`);
    await queryRunner.query(`DROP INDEX "UQ_student_guardians_pair"`);
    await queryRunner.query(`
      ALTER TABLE "student_guardians"
      ADD CONSTRAINT "UQ_student_guardians_pair"
      UNIQUE ("studentId", "guardianId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_student_guardians_one_primary"
      ON "student_guardians" ("studentId")
      WHERE "isPrimaryContact" = true
    `);
    await queryRunner.query(
      `ALTER TABLE "student_guardians" DROP COLUMN "endedAt"`,
    );
  }
}
