import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { AcademicYear } from "./academic-year.entity";
import { Student } from "./student.entity";
import { EnrollmentPlacement } from "./enrollment-placement.entity";

export enum EnrollmentStatus {
  ENROLLED = "ENROLLED",
  COMPLETED = "COMPLETED",
  WITHDRAWN = "WITHDRAWN",
  TRANSFERRED = "TRANSFERRED",
}

@Entity({ name: "enrollments" })
@Check('"exitDate" IS NULL OR "exitDate" >= "enrollmentDate"')
@Index("UQ_enrollments_student_year", ["studentId", "academicYearId"], {
  unique: true,
})
@Index("UQ_enrollments_id_year", ["id", "academicYearId"], { unique: true })
export class Enrollment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  studentId!: string;

  @ManyToOne(() => Student, (student) => student.enrollments, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "studentId" })
  student!: Student;

  @Column({ type: "uuid" })
  academicYearId!: string;

  @ManyToOne(() => AcademicYear, (year) => year.enrollments, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "academicYearId" })
  academicYear!: AcademicYear;

  @Column({
    type: "enum",
    enum: EnrollmentStatus,
    enumName: "enrollment_status",
    default: EnrollmentStatus.ENROLLED,
  })
  status!: EnrollmentStatus;

  @Column({ type: "date" })
  enrollmentDate!: string;

  @Column({ type: "date", nullable: true })
  exitDate!: string | null;

  @OneToMany(() => EnrollmentPlacement, (placement) => placement.enrollment)
  placements!: EnrollmentPlacement[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
