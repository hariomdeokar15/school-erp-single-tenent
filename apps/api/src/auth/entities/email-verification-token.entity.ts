import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity({ name: "email_verification_tokens" })
@Index("UQ_email_verification_tokens_hash", ["tokenHash"], { unique: true })
@Index("IDX_email_verification_tokens_user", ["userId", "expiresAt"])
export class EmailVerificationToken {
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
