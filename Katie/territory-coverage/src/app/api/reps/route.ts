import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const REP_PALETTE = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
  "#14B8A6", "#A855F7", "#E11D48", "#0EA5E9", "#22C55E",
];

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
  const { name, groupId, repColorHex } = body;

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
    },
    include: { territories: true },
  });

  return NextResponse.json(rep);
}
