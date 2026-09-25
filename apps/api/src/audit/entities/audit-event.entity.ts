import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("audit_events")
export class AuditEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  @Index()
  actorId!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  actorRole!: string | null;

  @Column({ type: "varchar", length: 100 })
  @Index()
  action!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  entityName!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  entityId!: string | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  userAgent!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  @Index()
  correlationId!: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;
}
