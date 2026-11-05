import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Section } from "./section.entity";
import { ClassSubject } from "./class-subject.entity";
import { TeacherAssignment } from "./teacher-assignment.entity";

@Entity({ name: "section_subjects" })
@Index(
  "UQ_section_subjects_section_class_subject",
  ["sectionId", "classSubjectId"],
  {
    unique: true,
  },
)
@Index(
  "UQ_section_subjects_id_year_level",
  ["id", "academicYearId", "classLevelId"],
  {
    unique: true,
  },
)
export class SectionSubject {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  sectionId!: string;

  @ManyToOne(() => Section, (section) => section.sectionSubjects, {
    onDelete: "RESTRICT",
  })
  @JoinColumn([
    { name: "sectionId", referencedColumnName: "id" },
    { name: "academicYearId", referencedColumnName: "academicYearId" },
    { name: "classLevelId", referencedColumnName: "classLevelId" },
  ])
  section!: Section;

  @Column({ type: "uuid" })
  classSubjectId!: string;

  @ManyToOne(() => ClassSubject, { onDelete: "RESTRICT" })
  @JoinColumn([
    { name: "classSubjectId", referencedColumnName: "id" },
    { name: "academicYearId", referencedColumnName: "academicYearId" },
    { name: "classLevelId", referencedColumnName: "classLevelId" },
  ])
  classSubject!: ClassSubject;

  @Column({ type: "uuid" })
  academicYearId!: string;

  @Column({ type: "uuid" })
  classLevelId!: string;

  @OneToMany(() => TeacherAssignment, (assignment) => assignment.sectionSubject)
  teacherAssignments!: TeacherAssignment[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
