import { MigrationInterface, QueryRunner } from "typeorm";

export class M2AcademicStudentFoundation2026103100000 implements MigrationInterface {
  name = "M2AcademicStudentFoundation2026103100000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist"`);
    await queryRunner.query(
      `CREATE TYPE "academic_year_status" AS ENUM ('PLANNED', 'ACTIVE', 'CLOSED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "student_status" AS ENUM ('ACTIVE', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "enrollment_status" AS ENUM ('ENROLLED', 'COMPLETED', 'WITHDRAWN', 'TRANSFERRED')`,
    );

    await queryRunner.query(`
      CREATE TABLE "academic_years" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(32) NOT NULL,
        "name" character varying(100) NOT NULL,
        "startsOn" date NOT NULL,
        "endsOn" date NOT NULL,
        "status" "academic_year_status" NOT NULL DEFAULT 'PLANNED',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_academic_years_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_academic_years_code" UNIQUE ("code"),
        CONSTRAINT "CHK_academic_years_dates" CHECK ("startsOn" <= "endsOn")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_academic_years_one_active"
      ON "academic_years" ("status") WHERE "status" = 'ACTIVE'`);

    await queryRunner.query(`
      CREATE TABLE "terms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "academicYearId" uuid NOT NULL,
        "code" character varying(32) NOT NULL,
        "name" character varying(100) NOT NULL,
        "sequence" smallint NOT NULL,
        "startsOn" date NOT NULL,
        "endsOn" date NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_terms_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_terms_year_code" UNIQUE ("academicYearId", "code"),
        CONSTRAINT "UQ_terms_year_sequence" UNIQUE ("academicYearId", "sequence"),
        CONSTRAINT "CHK_terms_sequence" CHECK ("sequence" > 0),
        CONSTRAINT "CHK_terms_dates" CHECK ("startsOn" <= "endsOn"),
        CONSTRAINT "FK_terms_academic_year" FOREIGN KEY ("academicYearId")
          REFERENCES "academic_years"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "class_levels" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(32) NOT NULL,
        "name" character varying(100) NOT NULL,
        "sortOrder" smallint NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_class_levels_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_class_levels_code" UNIQUE ("code"),
        CONSTRAINT "UQ_class_levels_sort_order" UNIQUE ("sortOrder")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "subjects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(32) NOT NULL,
        "name" character varying(120) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subjects_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subjects_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sections" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "academicYearId" uuid NOT NULL,
        "classLevelId" uuid NOT NULL,
        "code" character varying(32) NOT NULL,
        "name" character varying(100) NOT NULL,
        "capacity" smallint,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sections_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sections_year_class_code" UNIQUE ("academicYearId", "classLevelId", "code"),
        CONSTRAINT "UQ_sections_id_year_class" UNIQUE ("id", "academicYearId", "classLevelId"),
        CONSTRAINT "UQ_sections_id_year" UNIQUE ("id", "academicYearId"),
        CONSTRAINT "CHK_sections_capacity" CHECK ("capacity" IS NULL OR "capacity" > 0),
        CONSTRAINT "FK_sections_academic_year" FOREIGN KEY ("academicYearId")
          REFERENCES "academic_years"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_sections_class_level" FOREIGN KEY ("classLevelId")
          REFERENCES "class_levels"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_sections_year_class_active"
      ON "sections" ("academicYearId", "classLevelId", "isActive")`);

    await queryRunner.query(`
      CREATE TABLE "class_subjects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "academicYearId" uuid NOT NULL,
        "classLevelId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "isRequired" boolean NOT NULL DEFAULT true,
        "sequence" smallint,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_class_subjects_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_class_subjects_year_level_subject" UNIQUE ("academicYearId", "classLevelId", "subjectId"),
        CONSTRAINT "UQ_class_subjects_id_year_level" UNIQUE ("id", "academicYearId", "classLevelId"),
        CONSTRAINT "CHK_class_subjects_sequence" CHECK ("sequence" IS NULL OR "sequence" > 0),
        CONSTRAINT "FK_class_subjects_year" FOREIGN KEY ("academicYearId")
          REFERENCES "academic_years"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_class_subjects_level" FOREIGN KEY ("classLevelId")
          REFERENCES "class_levels"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_class_subjects_subject" FOREIGN KEY ("subjectId")
          REFERENCES "subjects"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "section_subjects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sectionId" uuid NOT NULL,
        "classSubjectId" uuid NOT NULL,
        "academicYearId" uuid NOT NULL,
        "classLevelId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_section_subjects_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_section_subjects_section_class_subject" UNIQUE ("sectionId", "classSubjectId"),
        CONSTRAINT "UQ_section_subjects_id_year_level" UNIQUE ("id", "academicYearId", "classLevelId"),
        CONSTRAINT "FK_section_subjects_section_context" FOREIGN KEY ("sectionId", "academicYearId", "classLevelId")
          REFERENCES "sections"("id", "academicYearId", "classLevelId") ON DELETE RESTRICT,
        CONSTRAINT "FK_section_subjects_class_subject_context" FOREIGN KEY ("classSubjectId", "academicYearId", "classLevelId")
          REFERENCES "class_subjects"("id", "academicYearId", "classLevelId") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "teacher_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sectionSubjectId" uuid NOT NULL,
        "teacherUserId" uuid NOT NULL,
        "startsOn" date NOT NULL,
        "endsOn" date,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teacher_assignments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_teacher_assignments_offering_teacher_start" UNIQUE ("sectionSubjectId", "teacherUserId", "startsOn"),
        CONSTRAINT "CHK_teacher_assignments_dates" CHECK ("endsOn" IS NULL OR "endsOn" >= "startsOn"),
        CONSTRAINT "EX_teacher_assignments_no_overlap" EXCLUDE USING gist (
          "sectionSubjectId" WITH =,
          "teacherUserId" WITH =,
          daterange("startsOn", "endsOn", '[]') WITH &&
        ),
        CONSTRAINT "FK_teacher_assignments_offering" FOREIGN KEY ("sectionSubjectId")
          REFERENCES "section_subjects"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_teacher_assignments_user" FOREIGN KEY ("teacherUserId")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_teacher_assignments_user_dates"
      ON "teacher_assignments" ("teacherUserId", "startsOn", "endsOn")`);

    await queryRunner.query(`
      CREATE TABLE "class_teacher_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sectionId" uuid NOT NULL,
        "teacherUserId" uuid NOT NULL,
        "startsOn" date NOT NULL,
        "endsOn" date,
        "reason" character varying(500),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_class_teacher_assignments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_class_teacher_assignments_section_start" UNIQUE ("sectionId", "startsOn"),
        CONSTRAINT "CHK_class_teacher_assignments_dates" CHECK ("endsOn" IS NULL OR "endsOn" >= "startsOn"),
        CONSTRAINT "EX_class_teacher_assignments_no_overlap" EXCLUDE USING gist (
          "sectionId" WITH =,
          daterange("startsOn", "endsOn", '[]') WITH &&
        ),
        CONSTRAINT "FK_class_teacher_assignments_section" FOREIGN KEY ("sectionId")
          REFERENCES "sections"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_class_teacher_assignments_user" FOREIGN KEY ("teacherUserId")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_class_teacher_assignments_one_current"
      ON "class_teacher_assignments" ("sectionId") WHERE "endsOn" IS NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_class_teacher_assignments_teacher_dates"
      ON "class_teacher_assignments" ("teacherUserId", "startsOn", "endsOn")`);

    await queryRunner.query(`
      CREATE TABLE "students" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentNumber" character varying(40) NOT NULL,
        "firstName" character varying(120) NOT NULL,
        "lastName" character varying(120) NOT NULL,
        "dateOfBirth" date,
        "status" "student_status" NOT NULL DEFAULT 'ACTIVE',
        "userId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_students_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_students_student_number" UNIQUE ("studentNumber"),
        CONSTRAINT "FK_students_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_students_user"
      ON "students" ("userId") WHERE "userId" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_students_name"
      ON "students" ("lastName", "firstName")`);

    await queryRunner.query(`
      CREATE TABLE "guardians" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "firstName" character varying(120) NOT NULL,
        "lastName" character varying(120) NOT NULL,
        "email" character varying(320),
        "phone" character varying(20),
        "userId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_guardians_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_guardians_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_guardians_user"
      ON "guardians" ("userId") WHERE "userId" IS NOT NULL`);
    await queryRunner.query(
      `CREATE INDEX "IDX_guardians_email" ON "guardians" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_guardians_phone" ON "guardians" ("phone")`,
    );

    await queryRunner.query(`
      CREATE TABLE "student_guardians" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "guardianId" uuid NOT NULL,
        "relationship" character varying(50) NOT NULL,
        "isPrimaryContact" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_guardians_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_student_guardians_pair" UNIQUE ("studentId", "guardianId"),
        CONSTRAINT "FK_student_guardians_student" FOREIGN KEY ("studentId")
          REFERENCES "students"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_student_guardians_guardian" FOREIGN KEY ("guardianId")
          REFERENCES "guardians"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_student_guardians_one_primary"
      ON "student_guardians" ("studentId") WHERE "isPrimaryContact" = true`);
    await queryRunner.query(`CREATE INDEX "IDX_student_guardians_guardian"
      ON "student_guardians" ("guardianId")`);

    await queryRunner.query(`
      CREATE TABLE "enrollments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "academicYearId" uuid NOT NULL,
        "status" "enrollment_status" NOT NULL DEFAULT 'ENROLLED',
        "enrollmentDate" date NOT NULL,
        "exitDate" date,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_enrollments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_enrollments_student_year" UNIQUE ("studentId", "academicYearId"),
        CONSTRAINT "UQ_enrollments_id_year" UNIQUE ("id", "academicYearId"),
        CONSTRAINT "CHK_enrollments_exit_date" CHECK ("exitDate" IS NULL OR "exitDate" >= "enrollmentDate"),
        CONSTRAINT "FK_enrollments_student" FOREIGN KEY ("studentId")
          REFERENCES "students"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_enrollments_academic_year" FOREIGN KEY ("academicYearId")
          REFERENCES "academic_years"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_enrollments_year_status"
      ON "enrollments" ("academicYearId", "status")`);

    await queryRunner.query(`
      CREATE TABLE "enrollment_placements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "enrollmentId" uuid NOT NULL,
        "academicYearId" uuid NOT NULL,
        "sectionId" uuid NOT NULL,
        "startsOn" date NOT NULL,
        "endsOn" date,
        "reason" character varying(500),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_enrollment_placements_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_enrollment_placements_id_year" UNIQUE ("id", "academicYearId"),
        CONSTRAINT "CHK_enrollment_placements_dates" CHECK ("endsOn" IS NULL OR "endsOn" >= "startsOn"),
        CONSTRAINT "EX_enrollment_placements_no_overlap" EXCLUDE USING gist (
          "enrollmentId" WITH =,
          daterange("startsOn", "endsOn", '[]') WITH &&
        ),
        CONSTRAINT "FK_enrollment_placements_enrollment_context" FOREIGN KEY ("enrollmentId", "academicYearId")
          REFERENCES "enrollments"("id", "academicYearId") ON DELETE RESTRICT,
        CONSTRAINT "FK_enrollment_placements_section_context" FOREIGN KEY ("sectionId", "academicYearId")
          REFERENCES "sections"("id", "academicYearId") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_enrollment_placements_one_current"
      ON "enrollment_placements" ("enrollmentId") WHERE "endsOn" IS NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_enrollment_placements_section_dates"
      ON "enrollment_placements" ("sectionId", "startsOn", "endsOn")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "enrollment_placements"`);
    await queryRunner.query(`DROP TABLE "enrollments"`);
    await queryRunner.query(`DROP TABLE "student_guardians"`);
    await queryRunner.query(`DROP TABLE "guardians"`);
    await queryRunner.query(`DROP TABLE "students"`);
    await queryRunner.query(`DROP TABLE "class_teacher_assignments"`);
    await queryRunner.query(`DROP TABLE "teacher_assignments"`);
    await queryRunner.query(`DROP TABLE "section_subjects"`);
    await queryRunner.query(`DROP TABLE "class_subjects"`);
    await queryRunner.query(`DROP TABLE "sections"`);
    await queryRunner.query(`DROP TABLE "subjects"`);
    await queryRunner.query(`DROP TABLE "class_levels"`);
    await queryRunner.query(`DROP TABLE "terms"`);
    await queryRunner.query(`DROP TABLE "academic_years"`);
    await queryRunner.query(`DROP TYPE "enrollment_status"`);
    await queryRunner.query(`DROP TYPE "student_status"`);
    await queryRunner.query(`DROP TYPE "academic_year_status"`);
  }
}
