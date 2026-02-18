import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateFixedAssetDto } from './dto/create-fixed-asset.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FixedAssetsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(
    businessId: string,
    fiscalYearId: string,
    userId: string,
    dto: CreateFixedAssetDto,
    correlationId: string,
  ) {
    const fy = await this.prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, businessId },
    });
    if (!fy) throw new NotFoundException('Fiscal year not found');

    const asset = await this.prisma.fixedAsset.create({
      data: {
        fiscalYearId,
        purchaseDate: new Date(dto.purchaseDate),
        description: dto.description,
        amountPaid: new Decimal(dto.amountPaid),
      },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'fixed_asset.created',
      entityType: 'FixedAsset',
      entityId: asset.id,
      afterState: {
        purchaseDate: dto.purchaseDate,
        description: dto.description,
        amountPaid: dto.amountPaid,
      },
    });

    return asset;
  }

  async findAll(businessId: string, fiscalYearId: string) {
    const fy = await this.prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, businessId },
    });
    if (!fy) throw new NotFoundException('Fiscal year not found');

    const assets = await this.prisma.fixedAsset.findMany({
      where: { fiscalYearId },
      orderBy: { purchaseDate: 'asc' },
    });

    const totalAmount = assets.reduce((sum: number, a) => sum + Number(a.amountPaid), 0);
    return { assets, totalAmount };
  }

  async findById(businessId: string, fiscalYearId: string, assetId: string) {
    const asset = await this.prisma.fixedAsset.findFirst({
      where: { id: assetId, fiscalYearId, fiscalYear: { businessId } },
    });
    if (!asset) throw new NotFoundException('Fixed asset not found');
    return asset;
  }

  async delete(
    businessId: string,
    fiscalYearId: string,
    assetId: string,
    userId: string,
    correlationId: string,
  ) {
    const asset = await this.findById(businessId, fiscalYearId, assetId);

    await this.prisma.fixedAsset.delete({ where: { id: assetId } });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'fixed_asset.deleted',
      entityType: 'FixedAsset',
      entityId: assetId,
      beforeState: {
        purchaseDate: asset.purchaseDate.toISOString(),
        description: asset.description,
        amountPaid: asset.amountPaid.toString(),
      },
    });

    return { message: 'Fixed asset deleted' };
  }
}
