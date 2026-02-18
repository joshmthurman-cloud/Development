import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryGroup } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(businessId: string, userId: string, dto: CreateCategoryDto, correlationId: string) {
    const existing = await this.prisma.category.findUnique({
      where: {
        businessId_name_parentId: {
          businessId,
          name: dto.name,
          parentId: dto.parentId || (null as any),
        },
      },
    });
    if (existing) throw new ConflictException('Category with this name already exists');

    const category = await this.prisma.category.create({
      data: {
        businessId,
        name: dto.name,
        group: dto.group,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { children: true, parent: true },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'category.created',
      entityType: 'Category',
      entityId: category.id,
      afterState: { name: dto.name, group: dto.group, parentId: dto.parentId },
    });

    return category;
  }

  async findAllForBusiness(businessId: string) {
    return this.prisma.category.findMany({
      where: { businessId },
      include: { children: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(businessId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, businessId },
      include: { children: { orderBy: { sortOrder: 'asc' } }, parent: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(
    businessId: string,
    categoryId: string,
    userId: string,
    dto: UpdateCategoryDto,
    correlationId: string,
  ) {
    const before = await this.findById(businessId, categoryId);

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { children: true, parent: true },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'category.updated',
      entityType: 'Category',
      entityId: categoryId,
      beforeState: { name: before.name, sortOrder: before.sortOrder, isActive: before.isActive },
      afterState: { name: updated.name, sortOrder: updated.sortOrder, isActive: updated.isActive },
    });

    return updated;
  }

  async seedDefaultCategories(businessId: string, userId: string, correlationId: string) {
    const defaults: { name: string; group: CategoryGroup; children?: string[] }[] = [
      { name: 'Income', group: CategoryGroup.INCOME },
      { name: 'Money from owner', group: CategoryGroup.OTHER_SOURCE_OF_FUNDS },
      { name: 'Distributions to owner', group: CategoryGroup.DISTRIBUTION },
      { name: 'Returns & Allowances', group: CategoryGroup.RETURNS_ALLOWANCES },
      { name: 'Contract Labor', group: CategoryGroup.CONTRACT_LABOR },
      { name: 'Fixed Asset Purchase', group: CategoryGroup.FIXED_ASSET_PURCHASE },
      { name: 'Credit Card Payment', group: CategoryGroup.CREDIT_CARD_PAYMENT },
      { name: 'Accounting', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Advertising', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Bank Fees', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Merchant fees', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Website', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Equipment(Stakes/Tarps)', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Insurance - Liability', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Insurance - Workers Comp', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Insurance - E&O', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Insurance - Health', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Insurance - Property', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Office Supplies', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Gas', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Canva (graphic design)', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Van Repair', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Legal Fees', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Registration and Tag', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'GoDaddy', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Misc', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Uniforms', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Other Professional Fees', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Outside Services', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Postage', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Mail Chimp', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Rent - Equipment', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Rent - Office', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Rent - Storage', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Vehicle Purchase', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Taxes - Other', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Tires', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'AT&T', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Travel', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Utilities', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Auto Insurance', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Repairs & Maintenance', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Contributions', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Dues & Subs', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Education/Seminars', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Gifts', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Licenses & Permits', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Meals & Entertainment', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Printing & Reprod', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Materials & Supplies', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Parts', group: CategoryGroup.OPERATING_EXPENSE },
      { name: 'Penalties', group: CategoryGroup.PENALTY },
      { name: 'Interest Expense', group: CategoryGroup.INTEREST_EXPENSE },
    ];

    const created = [];
    for (let i = 0; i < defaults.length; i++) {
      const def = defaults[i];
      const cat = await this.prisma.category.upsert({
        where: {
          businessId_name_parentId: {
            businessId,
            name: def.name,
            parentId: null as any,
          },
        },
        update: {},
        create: {
          businessId,
          name: def.name,
          group: def.group,
          sortOrder: i,
        },
      });
      created.push(cat);
    }

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'categories.seeded',
      entityType: 'Category',
      afterState: { count: created.length },
    });

    return created;
  }
}
