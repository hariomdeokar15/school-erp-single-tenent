import { Injectable, Logger } from "@nestjs/common";
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
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepository: Repository<AuditEvent>,
  ) {}

  async recordEvent(input: CreateAuditEventInput): Promise<AuditEvent | null> {
    try {
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

      return await this.auditRepository.save(event);
    } catch (error) {
      this.logger.error(
        `Failed to persist audit event [${input.action}]:`,
        error,
      );
      // Audit failure should not crash main execution path unless explicitly required
      return null;
    }
  }
}
