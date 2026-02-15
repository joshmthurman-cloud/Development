import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repId = (await params).id;

  const body = await req.json();
  const { stateAbbr, countyFipsList, wholeState } = body;

  if (!stateAbbr) {
    return NextResponse.json({ error: "stateAbbr required" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    if (wholeState === true) {
      // Whole State: delete all COUNTY rows, upsert STATE row
      await tx.territory.deleteMany({
        where: {
          ownerId: repId,
          stateAbbr,
          level: "COUNTY",
        },
      });
      await tx.territory.upsert({
        where: {
          ownerId_stateAbbr_level_countyFips: {
            ownerId: repId,
            stateAbbr,
            level: "STATE",
            countyFips: "",
          },
        },
        update: {},
        create: {
          ownerType: "REP",
          ownerId: repId,
          level: "STATE",
          stateAbbr,
          countyFips: "",
        },
      });
    } else {
      // Counties Only: delete STATE row, replace COUNTY rows
      await tx.territory.deleteMany({
        where: {
          ownerId: repId,
          stateAbbr,
          level: "STATE",
        },
      });
      await tx.territory.deleteMany({
        where: {
          ownerId: repId,
          stateAbbr,
          level: "COUNTY",
        },
      });
      const fipsList = Array.isArray(countyFipsList) ? countyFipsList : [];
      for (const fips of fipsList) {
        if (fips) {
          await tx.territory.upsert({
            where: {
              ownerId_stateAbbr_level_countyFips: {
                ownerId: repId,
                stateAbbr,
                level: "COUNTY",
                countyFips: String(fips),
              },
            },
            update: {},
            create: {
              ownerType: "REP",
              ownerId: repId,
              level: "COUNTY",
              stateAbbr,
              countyFips: String(fips),
            },
          });
        }
      }
    }
  });

  const rep = await prisma.rep.findUnique({
    where: { id: repId },
    include: { territories: true },
  });

  return NextResponse.json(rep);
}
