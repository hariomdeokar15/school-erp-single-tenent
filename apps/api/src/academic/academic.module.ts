import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { RoleAssignment } from "../auth/entities/role-assignment.entity";
import { User } from "../auth/entities/user.entity";
import { AcademicController } from "./academic.controller";
import { AcademicService } from "./academic.service";
import { AcademicYear } from "./entities/academic-year.entity";
import { ClassLevel } from "./entities/class-level.entity";
import { ClassSubject } from "./entities/class-subject.entity";
import { ClassTeacherAssignment } from "./entities/class-teacher-assignment.entity";
import { Enrollment } from "./entities/enrollment.entity";
import { EnrollmentPlacement } from "./entities/enrollment-placement.entity";
import { Guardian } from "./entities/guardian.entity";
import { Section } from "./entities/section.entity";
import { SectionSubject } from "./entities/section-subject.entity";
import { Student } from "./entities/student.entity";
import { StudentGuardian } from "./entities/student-guardian.entity";
import { Subject } from "./entities/subject.entity";
import { TeacherAssignment } from "./entities/teacher-assignment.entity";
import { Term } from "./entities/term.entity";
import {
  EnrollmentController,
  GuardianController,
  StudentController,
} from "./student.controller";
import { StudentService } from "./student.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcademicYear,
      Term,
      ClassLevel,
      Section,
      Subject,
      ClassSubject,
      SectionSubject,
      TeacherAssignment,
      ClassTeacherAssignment,
      Student,
      Guardian,
      StudentGuardian,
      Enrollment,
      EnrollmentPlacement,
      User,
      RoleAssignment,
    ]),
    AuditModule,
  ],
  controllers: [
    AcademicController,
    StudentController,
    GuardianController,
    EnrollmentController,
  ],
  providers: [AcademicService, StudentService],
  exports: [AcademicService, StudentService],
})
export class AcademicModule {}
