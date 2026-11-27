import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

export enum EmailOutboxKind {
  VERIFY_EMAIL = "VERIFY_EMAIL",
  PASSWORD_RESET = "PASSWORD_RESET",
  PASSWORD_RESET_COMPLETE = "PASSWORD_RESET_COMPLETE",
}

export enum EmailOutboxStatus {
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  ACCEPTED = "ACCEPTED",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED",
}

@Entity({ name: "email_outbox" })
@Index("IDX_email_outbox_dispatch", ["status", "availableAt"])
@Index("IDX_email_outbox_user_created", ["userId", "createdAt"])
export class EmailOutbox {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({
    type: "enum",
    enum: EmailOutboxKind,
    enumName: "email_outbox_kind",
  })
  kind!: EmailOutboxKind;

  @Column({ type: "uuid", nullable: true })
  resetTokenId!: string | null;

  @Column({ type: "uuid", nullable: true })
  verificationTokenId!: string | null;

  @Column({ type: "integer" })
  emailVersion!: number;

  @Column({ type: "varchar", length: 2, default: "en" })
  language!: "en" | "hi" | "mr";

  @Column({ type: "bytea", nullable: true, select: false })
  payloadCiphertext!: Buffer | null;

  @Column({ type: "bytea", nullable: true, select: false })
  payloadNonce!: Buffer | null;

  @Column({ type: "bytea", nullable: true, select: false })
  payloadTag!: Buffer | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  keyVersion!: string | null;

  @Column({
    type: "enum",
    enum: EmailOutboxStatus,
    enumName: "email_outbox_status",
    default: EmailOutboxStatus.QUEUED,
  })
  status!: EmailOutboxStatus;

  @Column({ type: "integer", default: 0 })
  attemptCount!: number;

  @Column({ type: "timestamptz", default: () => "now()" })
  availableAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  leaseExpiresAt!: Date | null;

  @Column({ type: "uuid", nullable: true })
  leaseId!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  expiresAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  acceptedAt!: Date | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  lastErrorCode!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
