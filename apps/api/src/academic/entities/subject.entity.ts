import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ClassSubject } from "./class-subject.entity";

@Entity({ name: "subjects" })
@Index("UQ_subjects_code", ["code"], { unique: true })
export class Subject {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 32 })
  code!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @OneToMany(() => ClassSubject, (classSubject) => classSubject.subject)
  classSubjects!: ClassSubject[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
