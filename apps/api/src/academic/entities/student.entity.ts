import {
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
import { User } from "../../auth/entities/user.entity";
import { StudentGuardian } from "./student-guardian.entity";
import { Enrollment } from "./enrollment.entity";

export enum StudentStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

@Entity({ name: "students" })
@Index("UQ_students_student_number", ["studentNumber"], { unique: true })
@Index("UQ_students_user", ["userId"], {
  unique: true,
  where: '"userId" IS NOT NULL',
})
export class Student {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 40 })
  studentNumber!: string;

  @Column({ type: "varchar", length: 120 })
  firstName!: string;

  @Column({ type: "varchar", length: 120 })
  lastName!: string;

  @Column({ type: "date", nullable: true })
  dateOfBirth!: string | null;

  @Column({
    type: "enum",
    enum: StudentStatus,
    enumName: "student_status",
    default: StudentStatus.ACTIVE,
  })
  status!: StudentStatus;

  @Column({ type: "uuid", nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "userId" })
  user!: User | null;

  @OneToMany(() => StudentGuardian, (link) => link.student)
  guardianLinks!: StudentGuardian[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
  enrollments!: Enrollment[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
