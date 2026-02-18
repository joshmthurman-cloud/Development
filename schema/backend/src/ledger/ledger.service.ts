import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoggingService } from '../logging/logging.service';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { LedgerQueryDto } from './dto/ledger-query.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountType } from '@prisma/client';

@Injectable()
export class LedgerService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private logger: LoggingService,
  ) {}

  async createEntry(
    businessId: string,
    fiscalYearId: string,
    userId: string,
    dto: CreateLedgerEntryDto,
    correlationId: string,
  ) {
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, businessId },
    });
    if (!fiscalYear) throw new NotFoundException('Fiscal year not found');

    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, businessId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const entry = await this.prisma.ledgerEntry.create({
      data: {
        fiscalYearId,
        categoryId: dto.categoryId,
        accountType: dto.accountType,
        month: dto.month,
        amount: new Decimal(dto.amount),
        description: dto.description,
        createdBy: userId,
      },
      include: { category: true },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'ledger_entry.created',
      entityType: 'LedgerEntry',
      entityId: entry.id,
      afterState: {
        categoryId: dto.categoryId,
        categoryName: category.name,
        accountType: dto.accountType,
        month: dto.month,
        amount: dto.amount,
      },
    });

    return entry;
  }

  async reverseEntry(
    businessId: string,
    fiscalYearId: string,
    entryId: string,
    userId: string,
    correlationId: string,
  ) {
    const original = await this.prisma.ledgerEntry.findFirst({
      where: { id: entryId, fiscalYearId },
      include: { category: true, fiscalYear: true },
    });

    if (!original) throw new NotFoundException('Ledger entry not found');
    if (original.fiscalYear.businessId !== businessId) {
      throw new NotFoundException('Ledger entry not found');
    }
    if (original.reversedById) {
      throw new BadRequestException('Entry has already been reversed');
    }

    const reversingEntry = await this.prisma.ledgerEntry.create({
      data: {
        fiscalYearId: original.fiscalYearId,
        categoryId: original.categoryId,
        accountType: original.accountType,
        month: original.month,
        amount: original.amount.negated(),
        description: `Reversal of entry ${original.id}`,
        createdBy: userId,
      },
    });

    await this.prisma.ledgerEntry.update({
      where: { id: original.id },
      data: { reversedById: reversingEntry.id },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'ledger_entry.reversed',
      entityType: 'LedgerEntry',
      entityId: entryId,
      beforeState: {
        amount: original.amount.toString(),
        category: original.category.name,
      },
      afterState: {
        reversingEntryId: reversingEntry.id,
        reversalAmount: reversingEntry.amount.toString(),
      },
    });

    return { original, reversingEntry };
  }

  async findEntries(businessId: string, fiscalYearId: string, query: LedgerQueryDto) {
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, businessId },
    });
    if (!fiscalYear) throw new NotFoundException('Fiscal year not found');

    const where: any = { fiscalYearId };
    if (query.accountType) where.accountType = query.accountType;
    if (query.month) where.month = query.month;
    if (query.categoryId) where.categoryId = query.categoryId;

    const [entries, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where,
        include: { category: true },
        orderBy: [{ month: 'asc' }, { createdAt: 'asc' }],
        skip: query.skip || 0,
        take: query.take || 100,
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);

    return { entries, total, skip: query.skip || 0, take: query.take || 100 };
  }

  async getSummary(businessId: string, fiscalYearId: string, accountType?: AccountType) {
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, businessId },
      include: { ledgerEntries: { include: { category: true } } },
    });
    if (!fiscalYear) throw new NotFoundException('Fiscal year not found');

    const entries = accountType
      ? fiscalYear.ledgerEntries.filter((e) => e.accountType === accountType)
      : fiscalYear.ledgerEntries;

    const monthlyTotals: Record<number, { income: number; expenses: number }> = {};
    const categoryTotals: Record<string, { name: string; group: string; total: number; monthly: Record<number, number> }> = {};

    for (let m = 1; m <= 12; m++) {
      monthlyTotals[m] = { income: 0, expenses: 0 };
    }

    for (const entry of entries) {
      const amount = Number(entry.amount);
      const catKey = entry.categoryId;

      if (!categoryTotals[catKey]) {
        categoryTotals[catKey] = {
          name: entry.category.name,
          group: entry.category.group,
          total: 0,
          monthly: {},
        };
        for (let m = 1; m <= 12; m++) {
          categoryTotals[catKey].monthly[m] = 0;
        }
      }

      categoryTotals[catKey].monthly[entry.month] += amount;
      categoryTotals[catKey].total += amount;

      if (entry.category.group === 'INCOME' || entry.category.group === 'OTHER_SOURCE_OF_FUNDS') {
        monthlyTotals[entry.month].income += amount;
      } else {
        monthlyTotals[entry.month].expenses += amount;
      }
    }

    return {
      fiscalYearId,
      year: fiscalYear.year,
      carryover: fiscalYear.carryover ? Number(fiscalYear.carryover) : 0,
      accountType: accountType || 'ALL',
      monthlyTotals,
      categoryTotals: Object.values(categoryTotals),
    };
  }
}
