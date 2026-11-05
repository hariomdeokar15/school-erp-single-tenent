import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Exclusion,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../auth/entities/user.entity";
import { Section } from "./section.entity";

@Entity({ name: "class_teacher_assignments" })
@Check('"endsOn" IS NULL OR "endsOn" >= "startsOn"')
@Exclusion(
  'USING gist ("sectionId" WITH =, daterange("startsOn", "endsOn", \'[]\') WITH &&)',
)
@Index(
  "UQ_class_teacher_assignments_section_start",
  ["sectionId", "startsOn"],
  {
    unique: true,
  },
)
@Index("UQ_class_teacher_assignments_one_current", ["sectionId"], {
  unique: true,
  where: '"endsOn" IS NULL',
})
export class ClassTeacherAssignment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  sectionId!: string;

  @ManyToOne(() => Section, (section) => section.classTeacherAssignments, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "sectionId" })
  section!: Section;

  @Column({ type: "uuid" })
  teacherUserId!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "teacherUserId" })
  teacher!: User;

  @Column({ type: "date" })
  startsOn!: string;

  @Column({ type: "date", nullable: true })
  endsOn!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
