import {
  Check,
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

@Entity({ name: "terms" })
@Check('"startsOn" <= "endsOn"')
@Index("UQ_terms_year_code", ["academicYearId", "code"], { unique: true })
@Index("UQ_terms_year_sequence", ["academicYearId", "sequence"], {
  unique: true,
})
export class Term {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  academicYearId!: string;

  @ManyToOne(() => AcademicYear, (year) => year.terms, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "academicYearId" })
  academicYear!: AcademicYear;

  @Column({ type: "varchar", length: 32 })
  code!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "smallint" })
  sequence!: number;

  @Column({ type: "date" })
  startsOn!: string;

  @Column({ type: "date" })
  endsOn!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
