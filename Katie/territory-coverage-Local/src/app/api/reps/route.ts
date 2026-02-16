import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const PALETTE = [
  "#4E79A7", // Blue
  "#F28E2B", // Orange
  "#E15759", // Red
  "#76B7B2", // Teal
  "#59A14F", // Green
  "#EDC948", // Yellow
  "#B07AA1", // Purple
  "#FF9DA7", // Pink
  "#9C755F", // Brown
  "#BAB0AC", // Gray
];

const REP_PALETTE = PALETTE;

/** Pick a color not used by the group or its reps (so reps in a group stay distinct). */
function pickDistinctRepColor(
  groupColorHex: string,
  usedHexes: string[]
): string {
  const used = new Set(usedHexes.map((h) => h?.toUpperCase?.() ?? ""));
  const groupNorm = groupColorHex?.replace(/^#/, "").toUpperCase();
  used.add(groupNorm);
  for (const c of REP_PALETTE) {
    const norm = c.replace(/^#/, "").toUpperCase();
    if (!used.has(norm)) return c;
  }
  return REP_PALETTE[used.size % REP_PALETTE.length];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, groupId, repColorHex, totalAmountOfSales, numberOfDealers, housingMarketShare } = body;

  if (!name || !groupId) {
    return NextResponse.json(
      { error: "Name and groupId are required" },
      { status: 400 }
    );
  }

  let colorToUse: string | null = repColorHex || null;
  if (!colorToUse) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { reps: { select: { repColorHex: true } } },
    });
    if (group) {
      const used: string[] = [
        group.colorHex,
        ...group.reps.map((r) => r.repColorHex).filter((x): x is string => x != null),
      ];
      colorToUse = pickDistinctRepColor(group.colorHex, used);
    }
  }

  const rep = await prisma.rep.create({
    data: {
      name,
      groupId,
      repColorHex: colorToUse,
      totalAmountOfSales: totalAmountOfSales != null ? Number(totalAmountOfSales) : null,
      numberOfDealers: numberOfDealers != null ? Number(numberOfDealers) : null,
      housingMarketShare: housingMarketShare != null ? Number(housingMarketShare) : null,
    },
    include: { territories: true },
  });

  return NextResponse.json(rep);
}
