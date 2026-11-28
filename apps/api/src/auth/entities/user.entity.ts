import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RoleAssignment } from "./role-assignment.entity";
import { AuthSession } from "./auth-session.entity";

export enum UserStatus {
  ACTIVE = "ACTIVE",
  DISABLED = "DISABLED",
}

@Entity({ name: "users" })
@Index("UQ_users_email", ["email"], { unique: true })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 320 })
  email!: string;

  @Column({ type: "varchar", length: 120 })
  displayName!: string;

  @Column({ type: "varchar", length: 255, select: false })
  passwordHash!: string;

  @Column({
    type: "enum",
    enum: UserStatus,
    enumName: "users_status",
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @Column({ type: "boolean", default: true })
  mustChangePassword!: boolean;

  @Column({ type: "integer", default: 1 })
  emailVersion!: number;

  @Column({ type: "timestamptz", nullable: true })
  emailVerifiedAt!: Date | null;

  @OneToMany(() => RoleAssignment, (assignment) => assignment.user)
  roleAssignments!: RoleAssignment[];

  @OneToMany(() => AuthSession, (session) => session.user)
  sessions!: AuthSession[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
