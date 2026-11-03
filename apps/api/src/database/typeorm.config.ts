import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { AuditEvent } from "../audit/entities/audit-event.entity";
import { User } from "../auth/entities/user.entity";
import { RoleAssignment } from "../auth/entities/role-assignment.entity";
import { AuthSession } from "../auth/entities/auth-session.entity";
import { AcademicYear } from "../academic/entities/academic-year.entity";
import { Term } from "../academic/entities/term.entity";
import { ClassLevel } from "../academic/entities/class-level.entity";
import { Section } from "../academic/entities/section.entity";
import { Subject } from "../academic/entities/subject.entity";
import { ClassSubject } from "../academic/entities/class-subject.entity";
import { SectionSubject } from "../academic/entities/section-subject.entity";
import { TeacherAssignment } from "../academic/entities/teacher-assignment.entity";
import { ClassTeacherAssignment } from "../academic/entities/class-teacher-assignment.entity";
import { Student } from "../academic/entities/student.entity";
import { Guardian } from "../academic/entities/guardian.entity";
import { StudentGuardian } from "../academic/entities/student-guardian.entity";
import { Enrollment } from "../academic/entities/enrollment.entity";
import { EnrollmentPlacement } from "../academic/entities/enrollment-placement.entity";

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const dbUrl = configService.get<string>("database.url");
  const environment = configService.get<string>("environment");

  return {
    type: "postgres",
    url: dbUrl,
    entities: [
      AuditEvent,
      User,
      RoleAssignment,
      AuthSession,
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
    ],
    migrations: [__dirname + "/migrations/*.{ts,js}"],
    synchronize: false, // Never auto-synchronize in production or dev
    logging: environment === "development",
    autoLoadEntities: true,
  };
};
