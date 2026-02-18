import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggingService } from '../logging/logging.service';

export interface AuditEventPayload {
  correlationId: string;
  userId?: string;
  businessId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeState?: any;
  afterState?: any;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggingService,
  ) {}

  async record(payload: AuditEventPayload): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          correlationId: payload.correlationId,
          userId: payload.userId,
          businessId: payload.businessId,
          action: payload.action,
          entityType: payload.entityType,
          entityId: payload.entityId,
          beforeState: payload.beforeState ?? undefined,
          afterState: payload.afterState ?? undefined,
          metadata: payload.metadata ? (payload.metadata as any) : undefined,
          ipAddress: payload.ipAddress,
          userAgent: payload.userAgent,
        },
      });

      this.logger.logEvent({
        action: payload.action,
        correlationId: payload.correlationId,
        userId: payload.userId,
        businessId: payload.businessId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        beforeState: payload.beforeState,
        afterState: payload.afterState,
        metadata: payload.metadata,
      });
    } catch (error) {
      this.logger.error(
        'Failed to write audit log',
        error instanceof Error ? error.stack : undefined,
        'AuditService',
        { payload },
      );
    }
  }

  async findByCorrelation(correlationId: string) {
    return this.prisma.auditLog.findMany({
      where: { correlationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByBusiness(businessId: string, options?: { skip?: number; take?: number }) {
    return this.prisma.auditLog.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip || 0,
      take: options?.take || 50,
    });
  }

  async findByUser(userId: string, options?: { skip?: number; take?: number }) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip || 0,
      take: options?.take || 50,
    });
  }
}
