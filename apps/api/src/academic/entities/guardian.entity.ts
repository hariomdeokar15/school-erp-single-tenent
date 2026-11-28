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

@Entity({ name: "guardians" })
@Index("UQ_guardians_user", ["userId"], {
  unique: true,
  where: '"userId" IS NOT NULL',
})
export class Guardian {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 120 })
  firstName!: string;

  @Column({ type: "varchar", length: 120 })
  lastName!: string;

  @Column({ type: "varchar", length: 320, nullable: true })
  email!: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: "uuid", nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "userId" })
  user!: User | null;

  @OneToMany(() => StudentGuardian, (link) => link.guardian)
  studentLinks!: StudentGuardian[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
