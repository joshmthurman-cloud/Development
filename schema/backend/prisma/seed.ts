import { PrismaClient, Role, CategoryGroup, AccountType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@schemabooks.com' },
    update: {},
    create: {
      email: 'demo@schemabooks.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'User',
    },
  });
  console.log(`  User: ${user.email} (${user.id})`);

  // Create demo business
  const business = await prisma.business.upsert({
    where: { id: user.id },
    update: {},
    create: {
      name: 'Demo Landscaping Co',
      members: {
        create: { userId: user.id, role: Role.OWNER },
      },
    },
  });
  console.log(`  Business: ${business.name} (${business.id})`);

  // Create fiscal year 2024
  const fiscalYear = await prisma.fiscalYear.upsert({
    where: { businessId_year: { businessId: business.id, year: 2024 } },
    update: {},
    create: {
      businessId: business.id,
      year: 2024,
      carryover: new Decimal(5449.55),
    },
  });
  console.log(`  Fiscal Year: ${fiscalYear.year}`);

  // Seed default categories (from Excel template)
  const categoryDefs: { name: string; group: CategoryGroup; sortOrder: number }[] = [
    { name: 'Income', group: CategoryGroup.INCOME, sortOrder: 0 },
    { name: 'Money from owner', group: CategoryGroup.OTHER_SOURCE_OF_FUNDS, sortOrder: 1 },
    { name: 'Distributions to owner', group: CategoryGroup.DISTRIBUTION, sortOrder: 2 },
    { name: 'Returns & Allowances', group: CategoryGroup.RETURNS_ALLOWANCES, sortOrder: 3 },
    { name: 'Contract Labor', group: CategoryGroup.CONTRACT_LABOR, sortOrder: 4 },
    { name: 'Fixed Asset Purchase', group: CategoryGroup.FIXED_ASSET_PURCHASE, sortOrder: 5 },
    { name: 'Credit Card Payment', group: CategoryGroup.CREDIT_CARD_PAYMENT, sortOrder: 6 },
    { name: 'Accounting', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 10 },
    { name: 'Advertising', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 11 },
    { name: 'Bank Fees', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 12 },
    { name: 'Merchant fees', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 13 },
    { name: 'Website', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 14 },
    { name: 'Equipment(Stakes/Tarps)', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 15 },
    { name: 'Insurance - Liability', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 16 },
    { name: 'Insurance - Workers Comp', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 17 },
    { name: 'Office Supplies', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 18 },
    { name: 'Gas', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 19 },
    { name: 'Canva (graphic design)', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 20 },
    { name: 'Van Repair', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 21 },
    { name: 'Legal Zoom', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 22 },
    { name: 'Registration and Tag', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 23 },
    { name: 'GoDaddy', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 24 },
    { name: 'Misc', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 25 },
    { name: 'Uniforms', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 26 },
    { name: 'Other Professional Fees', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 27 },
    { name: 'Outside Services', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 28 },
    { name: 'Postage', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 29 },
    { name: 'Mail Chimp', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 30 },
    { name: 'Rent - Equipment', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 31 },
    { name: 'Rent - Office', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 32 },
    { name: 'Rent - Storage', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 33 },
    { name: 'Vehicle Purchase', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 34 },
    { name: 'Taxes - Other', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 35 },
    { name: 'Tires', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 36 },
    { name: 'AT&T', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 37 },
    { name: 'Travel', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 38 },
    { name: 'Utilities', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 39 },
    { name: 'Auto Insurance', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 40 },
    { name: 'Repairs & Maintenance', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 41 },
    { name: 'Materials & Supplies', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 42 },
    { name: 'Parts', group: CategoryGroup.OPERATING_EXPENSE, sortOrder: 43 },
    { name: 'Penalties', group: CategoryGroup.PENALTY, sortOrder: 50 },
    { name: 'Interest Expense', group: CategoryGroup.INTEREST_EXPENSE, sortOrder: 51 },
  ];

  const categories: Record<string, string> = {};
  for (const def of categoryDefs) {
    const cat = await prisma.category.upsert({
      where: {
        businessId_name_parentId: {
          businessId: business.id,
          name: def.name,
          parentId: null as any,
        },
      },
      update: {},
      create: {
        businessId: business.id,
        name: def.name,
        group: def.group,
        sortOrder: def.sortOrder,
      },
    });
    categories[def.name] = cat.id;
  }
  console.log(`  Categories: ${Object.keys(categories).length} seeded`);

  // Seed some sample ledger entries from the Excel template data
  const sampleEntries = [
    { category: 'Income', month: 1, amount: 710.88 },
    { category: 'Income', month: 2, amount: 954.22 },
    { category: 'Income', month: 3, amount: 4938.48 },
    { category: 'Income', month: 4, amount: 4432.97 },
    { category: 'Income', month: 5, amount: 9530.77 },
    { category: 'Income', month: 6, amount: 5804.68 },
    { category: 'Gas', month: 1, amount: 35.06 },
    { category: 'Gas', month: 2, amount: 102.47 },
    { category: 'Gas', month: 3, amount: 553.79 },
    { category: 'Gas', month: 4, amount: 595.32 },
    { category: 'Gas', month: 5, amount: 682.87 },
    { category: 'Gas', month: 6, amount: 776.27 },
    { category: 'Advertising', month: 3, amount: 370.00 },
    { category: 'Advertising', month: 4, amount: 58.23 },
    { category: 'Insurance - Liability', month: 3, amount: 1223.60 },
    { category: 'Insurance - Liability', month: 5, amount: 1010.00 },
    { category: 'Merchant fees', month: 1, amount: 19.92 },
    { category: 'Merchant fees', month: 2, amount: 54.95 },
    { category: 'Website', month: 1, amount: 99.00 },
    { category: 'Website', month: 2, amount: 99.00 },
    { category: 'AT&T', month: 1, amount: 96.83 },
    { category: 'AT&T', month: 2, amount: 96.83 },
  ];

  let entryCount = 0;
  for (const entry of sampleEntries) {
    if (categories[entry.category]) {
      await prisma.ledgerEntry.create({
        data: {
          fiscalYearId: fiscalYear.id,
          categoryId: categories[entry.category],
          accountType: AccountType.BANK,
          month: entry.month,
          amount: new Decimal(entry.amount),
          createdBy: user.id,
        },
      });
      entryCount++;
    }
  }
  console.log(`  Ledger entries: ${entryCount} seeded`);

  // Seed a fixed asset
  await prisma.fixedAsset.create({
    data: {
      fiscalYearId: fiscalYear.id,
      purchaseDate: new Date('2024-03-15'),
      description: 'Rainbow Combo',
      amountPaid: new Decimal(2000),
    },
  });
  console.log('  Fixed asset: Rainbow Combo seeded');

  console.log('\nSeed complete!');
  console.log(`\nDemo credentials:\n  Email: demo@schemabooks.com\n  Password: Password123!`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
