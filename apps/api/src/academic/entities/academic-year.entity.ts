import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Term } from "./term.entity";
import { Section } from "./section.entity";
import { ClassSubject } from "./class-subject.entity";
import { Enrollment } from "./enrollment.entity";

export enum AcademicYearStatus {
  PLANNED = "PLANNED",
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED",
}

@Entity({ name: "academic_years" })
@Check('"startsOn" <= "endsOn"')
@Index("UQ_academic_years_code", ["code"], { unique: true })
@Index("UQ_academic_years_one_active", ["status"], {
  unique: true,
  where: "\"status\" = 'ACTIVE'",
})
export class AcademicYear {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 32 })
  code!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "date" })
  startsOn!: string;

  @Column({ type: "date" })
  endsOn!: string;

  @Column({
    type: "enum",
    enum: AcademicYearStatus,
    enumName: "academic_year_status",
    default: AcademicYearStatus.PLANNED,
  })
  status!: AcademicYearStatus;

  @OneToMany(() => Term, (term) => term.academicYear)
  terms!: Term[];

  @OneToMany(() => Section, (section) => section.academicYear)
  sections!: Section[];

  @OneToMany(() => ClassSubject, (subject) => subject.academicYear)
  classSubjects!: ClassSubject[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.academicYear)
  enrollments!: Enrollment[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
