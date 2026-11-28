import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Section } from "./section.entity";
import { ClassSubject } from "./class-subject.entity";

@Entity({ name: "class_levels" })
@Index("UQ_class_levels_code", ["code"], { unique: true })
@Index("UQ_class_levels_sort_order", ["sortOrder"], { unique: true })
export class ClassLevel {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 32 })
  code!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "smallint" })
  sortOrder!: number;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @OneToMany(() => Section, (section) => section.classLevel)
  sections!: Section[];

  @OneToMany(() => ClassSubject, (subject) => subject.classLevel)
  classSubjects!: ClassSubject[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
