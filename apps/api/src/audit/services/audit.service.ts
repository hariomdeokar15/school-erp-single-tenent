import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditEvent } from "../entities/audit-event.entity";

export interface CreateAuditEventInput {
  actorId?: string;
  actorRole?: string;
  action: string;
  entityName?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepository: Repository<AuditEvent>,
  ) {}

  async recordEvent(input: CreateAuditEventInput): Promise<AuditEvent> {
    const event = this.auditRepository.create({
      actorId: input.actorId || null,
      actorRole: input.actorRole || null,
      action: input.action,
      entityName: input.entityName || null,
      entityId: input.entityId || null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
      correlationId: input.correlationId || null,
      metadata: input.metadata || null,
    });

    // Callers must not silently continue when a required audit write fails.
    return this.auditRepository.save(event);
  }
}
