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
import { ClassLevel } from "./class-level.entity";
import { SectionSubject } from "./section-subject.entity";
import { ClassTeacherAssignment } from "./class-teacher-assignment.entity";

@Entity({ name: "sections" })
@Check('"capacity" IS NULL OR "capacity" > 0')
@Index(
  "UQ_sections_year_class_code",
  ["academicYearId", "classLevelId", "code"],
  {
    unique: true,
  },
)
@Index("UQ_sections_id_year_class", ["id", "academicYearId", "classLevelId"], {
  unique: true,
})
@Index("UQ_sections_id_year", ["id", "academicYearId"], { unique: true })
export class Section {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  academicYearId!: string;

  @ManyToOne(() => AcademicYear, (year) => year.sections, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "academicYearId" })
  academicYear!: AcademicYear;

  @Column({ type: "uuid" })
  classLevelId!: string;

  @ManyToOne(() => ClassLevel, (classLevel) => classLevel.sections, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "classLevelId" })
  classLevel!: ClassLevel;

  @Column({ type: "varchar", length: 32 })
  code!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "smallint", nullable: true })
  capacity!: number | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @OneToMany(() => SectionSubject, (sectionSubject) => sectionSubject.section)
  sectionSubjects!: SectionSubject[];

  @OneToMany(() => ClassTeacherAssignment, (assignment) => assignment.section)
  classTeacherAssignments!: ClassTeacherAssignment[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
