import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoggingService } from '../logging/logging.service';
import { CreateRevisionDto } from './dto/create-revision.dto';

const MAX_REVISIONS = 4;

@Injectable()
export class RevisionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private logger: LoggingService,
  ) {}

  async createRevision(
    businessId: string,
    fiscalYearId: string,
    userId: string,
    dto: CreateRevisionDto,
    correlationId: string,
  ) {
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, businessId },
    });
    if (!fiscalYear) throw new NotFoundException('Fiscal year not found');

    const entries = await this.prisma.ledgerEntry.findMany({
      where: { fiscalYearId },
      include: { category: true },
      orderBy: { createdAt: 'asc' },
    });

    const snapshot = entries.map((e) => ({
      id: e.id,
      categoryId: e.categoryId,
      categoryName: e.category.name,
      accountType: e.accountType,
      month: e.month,
      amount: e.amount.toString(),
      description: e.description,
      reversedById: e.reversedById,
      createdAt: e.createdAt.toISOString(),
      createdBy: e.createdBy,
    }));

    const latestRevision = await this.prisma.revision.findFirst({
      where: { fiscalYearId },
      orderBy: { revisionNumber: 'desc' },
    });

    const nextNumber = (latestRevision?.revisionNumber || 0) + 1;

    const revision = await this.prisma.revision.create({
      data: {
        fiscalYearId,
        revisionNumber: nextNumber,
        description: dto.description,
        snapshotData: snapshot,
        createdBy: userId,
      },
    });

    const revisionCount = await this.prisma.revision.count({ where: { fiscalYearId } });
    if (revisionCount > MAX_REVISIONS) {
      const oldest = await this.prisma.revision.findFirst({
        where: { fiscalYearId },
        orderBy: { revisionNumber: 'asc' },
      });
      if (oldest) {
        await this.prisma.revision.delete({ where: { id: oldest.id } });
        this.logger.log(
          `Pruned oldest revision #${oldest.revisionNumber} for fiscal year ${fiscalYearId}`,
          'RevisionsService',
        );
      }
    }

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'revision.created',
      entityType: 'Revision',
      entityId: revision.id,
      afterState: {
        revisionNumber: nextNumber,
        entryCount: snapshot.length,
        description: dto.description,
      },
    });

    return revision;
  }

  async listRevisions(businessId: string, fiscalYearId: string) {
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, businessId },
    });
    if (!fiscalYear) throw new NotFoundException('Fiscal year not found');

    return this.prisma.revision.findMany({
      where: { fiscalYearId },
      orderBy: { revisionNumber: 'desc' },
      select: {
        id: true,
        revisionNumber: true,
        description: true,
        createdAt: true,
        createdBy: true,
      },
    });
  }

  async getRevision(businessId: string, fiscalYearId: string, revisionId: string) {
    const revision = await this.prisma.revision.findFirst({
      where: { id: revisionId, fiscalYearId, fiscalYear: { businessId } },
    });
    if (!revision) throw new NotFoundException('Revision not found');
    return revision;
  }

  async rollback(
    businessId: string,
    fiscalYearId: string,
    revisionId: string,
    userId: string,
    correlationId: string,
  ) {
    const revision = await this.getRevision(businessId, fiscalYearId, revisionId);
    const snapshotEntries = revision.snapshotData as any[];

    if (!Array.isArray(snapshotEntries)) {
      throw new BadRequestException('Invalid revision snapshot data');
    }

    const currentEntries = await this.prisma.ledgerEntry.findMany({
      where: { fiscalYearId },
    });

    const beforeState = {
      entryCount: currentEntries.length,
      totalAmount: currentEntries.reduce((s, e) => s + Number(e.amount), 0),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.ledgerEntry.deleteMany({ where: { fiscalYearId } });

      for (const entry of snapshotEntries) {
        await tx.ledgerEntry.create({
          data: {
            id: entry.id,
            fiscalYearId,
            categoryId: entry.categoryId,
            accountType: entry.accountType,
            month: entry.month,
            amount: entry.amount,
            description: entry.description,
            reversedById: entry.reversedById,
            createdBy: entry.createdBy,
            createdAt: new Date(entry.createdAt),
          },
        });
      }
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'revision.rollback',
      entityType: 'Revision',
      entityId: revisionId,
      beforeState,
      afterState: {
        revisionNumber: revision.revisionNumber,
        restoredEntryCount: snapshotEntries.length,
      },
    });

    return {
      message: `Rolled back to revision #${revision.revisionNumber}`,
      restoredEntries: snapshotEntries.length,
    };
  }
}
