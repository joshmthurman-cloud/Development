import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpsertOfficeInHomeDto } from './dto/upsert-office-in-home.dto';
import { UpsertOihExpenseDto } from './dto/upsert-oih-expense.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OfficeInHomeService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async upsert(
    businessId: string,
    fiscalYearId: string,
    userId: string,
    dto: UpsertOfficeInHomeDto,
    correlationId: string,
  ) {
    const fy = await this.prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, businessId },
    });
    if (!fy) throw new NotFoundException('Fiscal year not found');

    const oih = await this.prisma.officeInHome.upsert({
      where: { fiscalYearId },
      create: {
        fiscalYearId,
        officeSquareFootage: dto.officeSquareFootage !== undefined ? new Decimal(dto.officeSquareFootage) : null,
        totalSquareFootage: dto.totalSquareFootage !== undefined ? new Decimal(dto.totalSquareFootage) : null,
      },
      update: {
        ...(dto.officeSquareFootage !== undefined && {
          officeSquareFootage: new Decimal(dto.officeSquareFootage),
        }),
        ...(dto.totalSquareFootage !== undefined && {
          totalSquareFootage: new Decimal(dto.totalSquareFootage),
        }),
      },
      include: { expenses: true },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'office_in_home.upserted',
      entityType: 'OfficeInHome',
      entityId: oih.id,
      afterState: {
        officeSquareFootage: oih.officeSquareFootage?.toString(),
        totalSquareFootage: oih.totalSquareFootage?.toString(),
      },
    });

    return oih;
  }

  async get(businessId: string, fiscalYearId: string) {
    const fy = await this.prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, businessId },
    });
    if (!fy) throw new NotFoundException('Fiscal year not found');

    const oih = await this.prisma.officeInHome.findUnique({
      where: { fiscalYearId },
      include: {
        expenses: { orderBy: [{ category: 'asc' }, { month: 'asc' }] },
      },
    });

    if (!oih) return { fiscalYearId, officeInHome: null, deduction: null };

    const totalExpenses = oih.expenses.reduce((sum: number, e) => sum + Number(e.amount), 0);
    const officePct =
      oih.officeSquareFootage && oih.totalSquareFootage && Number(oih.totalSquareFootage) > 0
        ? Number(oih.officeSquareFootage) / Number(oih.totalSquareFootage)
        : 0;
    const deduction = totalExpenses * officePct;

    return {
      fiscalYearId,
      officeInHome: oih,
      officePercentage: Math.round(officePct * 10000) / 100,
      totalExpenses,
      deduction: Math.round(deduction * 100) / 100,
    };
  }

  async upsertExpense(
    businessId: string,
    fiscalYearId: string,
    userId: string,
    dto: UpsertOihExpenseDto,
    correlationId: string,
  ) {
    const fy = await this.prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, businessId },
    });
    if (!fy) throw new NotFoundException('Fiscal year not found');

    let oih = await this.prisma.officeInHome.findUnique({ where: { fiscalYearId } });
    if (!oih) {
      oih = await this.prisma.officeInHome.create({ data: { fiscalYearId } });
    }

    const expense = await this.prisma.officeInHomeExpense.upsert({
      where: {
        officeInHomeId_category_month: {
          officeInHomeId: oih.id,
          category: dto.category,
          month: dto.month,
        },
      },
      create: {
        officeInHomeId: oih.id,
        category: dto.category,
        month: dto.month,
        amount: new Decimal(dto.amount),
      },
      update: {
        amount: new Decimal(dto.amount),
      },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'oih_expense.upserted',
      entityType: 'OfficeInHomeExpense',
      entityId: expense.id,
      afterState: { category: dto.category, month: dto.month, amount: dto.amount },
    });

    return expense;
  }
}
