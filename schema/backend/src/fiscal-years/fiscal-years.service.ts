import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { UpdateFiscalYearDto } from './dto/update-fiscal-year.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FiscalYearsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(businessId: string, userId: string, dto: CreateFiscalYearDto, correlationId: string) {
    const existing = await this.prisma.fiscalYear.findUnique({
      where: { businessId_year: { businessId, year: dto.year } },
    });
    if (existing) throw new ConflictException(`Fiscal year ${dto.year} already exists`);

    const fiscalYear = await this.prisma.fiscalYear.create({
      data: {
        businessId,
        year: dto.year,
        carryover: dto.carryover !== undefined ? new Decimal(dto.carryover) : null,
      },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'fiscal_year.created',
      entityType: 'FiscalYear',
      entityId: fiscalYear.id,
      afterState: { year: dto.year, carryover: dto.carryover },
    });

    return fiscalYear;
  }

  async findAllForBusiness(businessId: string) {
    return this.prisma.fiscalYear.findMany({
      where: { businessId },
      orderBy: { year: 'desc' },
      include: {
        _count: { select: { ledgerEntries: true, revisions: true } },
      },
    });
  }

  async findById(businessId: string, fiscalYearId: string) {
    const fy = await this.prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, businessId },
      include: {
        _count: { select: { ledgerEntries: true, revisions: true, fixedAssets: true } },
      },
    });
    if (!fy) throw new NotFoundException('Fiscal year not found');
    return fy;
  }

  async update(
    businessId: string,
    fiscalYearId: string,
    userId: string,
    dto: UpdateFiscalYearDto,
    correlationId: string,
  ) {
    const before = await this.findById(businessId, fiscalYearId);

    const updated = await this.prisma.fiscalYear.update({
      where: { id: fiscalYearId },
      data: {
        ...(dto.carryover !== undefined && { carryover: new Decimal(dto.carryover) }),
        ...(dto.mileageDriven !== undefined && { mileageDriven: dto.mileageDriven }),
      },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'fiscal_year.updated',
      entityType: 'FiscalYear',
      entityId: fiscalYearId,
      beforeState: { carryover: before.carryover?.toString(), mileageDriven: before.mileageDriven },
      afterState: { carryover: updated.carryover?.toString(), mileageDriven: updated.mileageDriven },
    });

    return updated;
  }
}
