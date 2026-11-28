import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from "typeorm";
import { UserRole } from "@schoolerp/contracts";
import { User } from "./user.entity";

@Entity({ name: "role_assignments" })
@Index("UQ_role_assignments_user_role", ["userId", "role"], { unique: true })
export class RoleAssignment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, (user) => user.roleAssignments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "enum", enum: UserRole, enumName: "user_role" })
  role!: UserRole;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
