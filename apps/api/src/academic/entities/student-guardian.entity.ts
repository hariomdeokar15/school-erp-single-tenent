import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Student } from "./student.entity";
import { Guardian } from "./guardian.entity";

@Entity({ name: "student_guardians" })
@Index("UQ_student_guardians_pair", ["studentId", "guardianId"], {
  unique: true,
})
@Index("UQ_student_guardians_one_primary", ["studentId"], {
  unique: true,
  where: '"isPrimaryContact" = true',
})
export class StudentGuardian {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  studentId!: string;

  @ManyToOne(() => Student, (student) => student.guardianLinks, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "studentId" })
  student!: Student;

  @Column({ type: "uuid" })
  guardianId!: string;

  @ManyToOne(() => Guardian, (guardian) => guardian.studentLinks, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "guardianId" })
  guardian!: Guardian;

  @Column({ type: "varchar", length: 50 })
  relationship!: string;

  @Column({ type: "boolean", default: false })
  isPrimaryContact!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
