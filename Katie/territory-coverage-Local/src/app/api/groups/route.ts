import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PALETTE = [
  "#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F",
  "#EDC948", "#B07AA1", "#FF9DA7", "#9C755F", "#BAB0AC",
];

/** Pick first palette color not used by any existing group (top to bottom). */
function pickNextGroupColor(usedHexes: string[]): string {
  const used = new Set(usedHexes.map((h) => (h ?? "").replace(/^#/, "").toUpperCase()));
  for (const c of PALETTE) {
    const norm = c.replace(/^#/, "").toUpperCase();
    if (!used.has(norm)) return c;
  }
  return PALETTE[used.length % PALETTE.length];
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = await prisma.group.findMany({
    include: {
      reps: {
        include: {
          territories: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, colorHex, workGroupAccount } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  let colorToUse = colorHex;
  if (!colorToUse) {
    const existing = await prisma.group.findMany({ select: { colorHex: true } });
    colorToUse = pickNextGroupColor(existing.map((g) => g.colorHex));
  }

  const group = await prisma.group.create({
    data: {
      name,
      colorHex: colorToUse,
      servicesWholeState: body.servicesWholeState ?? true,
      workGroupAccount: workGroupAccount || null,
    },
  });

  return NextResponse.json(group);
}
