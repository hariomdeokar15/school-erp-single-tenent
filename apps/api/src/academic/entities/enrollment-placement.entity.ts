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
import { Enrollment } from "./enrollment.entity";
import { Section } from "./section.entity";

@Entity({ name: "enrollment_placements" })
@Check('"endsOn" IS NULL OR "endsOn" >= "startsOn"')
@Exclusion(
  'USING gist ("enrollmentId" WITH =, daterange("startsOn", "endsOn", \'[]\') WITH &&)',
)
@Index("UQ_enrollment_placements_id_year", ["id", "academicYearId"], {
  unique: true,
})
@Index("UQ_enrollment_placements_one_current", ["enrollmentId"], {
  unique: true,
  where: '"endsOn" IS NULL',
})
export class EnrollmentPlacement {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  enrollmentId!: string;

  @ManyToOne(() => Enrollment, (enrollment) => enrollment.placements, {
    onDelete: "RESTRICT",
  })
  @JoinColumn([
    { name: "enrollmentId", referencedColumnName: "id" },
    { name: "academicYearId", referencedColumnName: "academicYearId" },
  ])
  enrollment!: Enrollment;

  @Column({ type: "uuid" })
  academicYearId!: string;

  @Column({ type: "uuid" })
  sectionId!: string;

  @ManyToOne(() => Section, { onDelete: "RESTRICT" })
  @JoinColumn([
    { name: "sectionId", referencedColumnName: "id" },
    { name: "academicYearId", referencedColumnName: "academicYearId" },
  ])
  section!: Section;

  @Column({ type: "date" })
  startsOn!: string;

  @Column({ type: "date", nullable: true })
  endsOn!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
