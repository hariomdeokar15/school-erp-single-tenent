import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity({ name: "password_reset_tokens" })
@Index("UQ_password_reset_tokens_hash", ["tokenHash"], { unique: true })
@Index("IDX_password_reset_tokens_user", ["userId", "expiresAt"])
export class PasswordResetToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "character", length: 64 })
  tokenHash!: string;

  @Column({ type: "integer" })
  emailVersion!: number;

  @Column({ type: "varchar", length: 2, default: "en" })
  language!: "en" | "hi" | "mr";

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
