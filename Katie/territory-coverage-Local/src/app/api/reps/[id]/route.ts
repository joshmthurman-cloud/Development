import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rep = await prisma.rep.findUnique({
    where: { id: (await params).id },
    include: { group: true, territories: true },
  });

  if (!rep) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(rep);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, repColorHex } = body;

  const repId = (await params).id;
  if (repColorHex != null) {
    const existing = await prisma.rep.findUnique({
      where: { id: repId },
      include: { group: { include: { reps: { where: { id: { not: repId } }, select: { repColorHex: true } } } } },
    });
    if (existing?.group) {
      const usedByOthers = new Set(
        existing.group.reps.map((r) => (r.repColorHex ?? "").replace(/^#/, "").toUpperCase())
      );
      const groupNorm = existing.group.colorHex?.replace(/^#/, "").toUpperCase();
      const newNorm = String(repColorHex).replace(/^#/, "").toUpperCase();
      if (usedByOthers.has(newNorm) || groupNorm === newNorm) {
        return NextResponse.json(
          { error: "Another rep in this group already uses that color (or the group color). Pick a different color." },
          { status: 400 }
        );
      }
    }
  }

  const rep = await prisma.rep.update({
    where: { id: repId },
    data: {
      ...(name != null && { name }),
      ...(repColorHex != null && { repColorHex }),
    },
    include: { group: true, territories: true },
  });

  return NextResponse.json(rep);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.rep.delete({
    where: { id: (await params).id },
  });

  return NextResponse.json({ ok: true });
}
