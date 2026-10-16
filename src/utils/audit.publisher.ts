import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { AuditLevel } from '../auth/dto/audit-event.dto';

interface AuditLogOptions {
  action: string;
  entity: string;
  entityId?: string;
  performedBy?: string;
  metadata?: Record<string, any>;
  municipalityId?: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  level?: AuditLevel;
}

@Injectable()
export class AuditPublisher {
  constructor(
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
  ) {}

  log(options: AuditLogOptions) {
    const event = {
      eventId: randomUUID(),
      service: process.env.SERVICE_NAME || 'unknown-service',
      action: options.action,
      entity: options.entity,
      entityId: options.entityId,
      performedBy: options.performedBy,
      metadata: options.metadata,
      municipalityId: options.municipalityId,
      correlationId: options.correlationId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      level: options.level || AuditLevel.INFO,
      timestamp: new Date().toISOString(),
    };

    // 🔥 Fire and forget (NO await)
    this.natsClient.emit('audit.log', event);
  }
}