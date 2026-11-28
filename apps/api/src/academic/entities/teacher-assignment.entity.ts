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
import { SectionSubject } from "./section-subject.entity";

@Entity({ name: "teacher_assignments" })
@Check('"endsOn" IS NULL OR "endsOn" >= "startsOn"')
@Exclusion(
  'USING gist ("sectionSubjectId" WITH =, "teacherUserId" WITH =, daterange("startsOn", "endsOn", \'[]\') WITH &&)',
)
@Index(
  "UQ_teacher_assignments_offering_teacher_start",
  ["sectionSubjectId", "teacherUserId", "startsOn"],
  { unique: true },
)
export class TeacherAssignment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  sectionSubjectId!: string;

  @ManyToOne(() => SectionSubject, (offering) => offering.teacherAssignments, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "sectionSubjectId" })
  sectionSubject!: SectionSubject;

  @Column({ type: "uuid" })
  teacherUserId!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "teacherUserId" })
  teacher!: User;

  @Column({ type: "date" })
  startsOn!: string;

  @Column({ type: "date", nullable: true })
  endsOn!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
