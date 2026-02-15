import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  const rep = await prisma.rep.create({
    data: {
      name,
      groupId,
      repColorHex: repColorHex || null,
    },
    include: { territories: true },
  });

  return NextResponse.json(rep);
}
