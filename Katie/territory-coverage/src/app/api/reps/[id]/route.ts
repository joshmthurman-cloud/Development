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

  const rep = await prisma.rep.update({
    where: { id: (await params).id },
    data: {
      ...(name != null && { name }),
      ...(repColorHex != null && { repColorHex }),
    },
    include: { territories: true },
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
