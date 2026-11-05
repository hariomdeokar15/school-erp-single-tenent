import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { AcademicYear } from "./academic-year.entity";
import { ClassLevel } from "./class-level.entity";
import { Subject } from "./subject.entity";

@Entity({ name: "class_subjects" })
@Index(
  "UQ_class_subjects_year_level_subject",
  ["academicYearId", "classLevelId", "subjectId"],
  { unique: true },
)
@Index(
  "UQ_class_subjects_id_year_level",
  ["id", "academicYearId", "classLevelId"],
  {
    unique: true,
  },
)
export class ClassSubject {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  academicYearId!: string;

  @ManyToOne(() => AcademicYear, (year) => year.classSubjects, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "academicYearId" })
  academicYear!: AcademicYear;

  @Column({ type: "uuid" })
  classLevelId!: string;

  @ManyToOne(() => ClassLevel, (classLevel) => classLevel.classSubjects, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "classLevelId" })
  classLevel!: ClassLevel;

  @Column({ type: "uuid" })
  subjectId!: string;

  @ManyToOne(() => Subject, (subject) => subject.classSubjects, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "subjectId" })
  subject!: Subject;

  @Column({ type: "boolean", default: true })
  isRequired!: boolean;

  @Column({ type: "smallint", nullable: true })
  sequence!: number | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
