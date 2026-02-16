import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import * as fs from "fs";
import * as path from "path";

const STATE_TO_FIPS: Record<string, string> = {
  AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DE:"10",DC:"11",
  FL:"12",GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",KS:"20",KY:"21",
  LA:"22",ME:"23",MD:"24",MA:"25",MI:"26",MN:"27",MS:"28",MO:"29",MT:"30",
  NE:"31",NV:"32",NH:"33",NJ:"34",NM:"35",NY:"36",NC:"37",ND:"38",OH:"39",
  OK:"40",OR:"41",PA:"42",RI:"44",SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",
  VT:"50",VA:"51",WA:"53",WV:"54",WI:"55",WY:"56",
};

function getCountyCount(stateAbbr: string): number {
  const localPath = path.join(process.cwd(), "public", "data", "geo", "counties", `${stateAbbr}.geojson`);
  if (fs.existsSync(localPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(localPath, "utf-8"));
      return data.features?.length ?? 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const stateAbbr = url.searchParams.get("state")?.toUpperCase();
  const viewMode = url.searchParams.get("mode") ?? "group";
  const groupFilter = url.searchParams.get("groups");
  const filterGroupIds = groupFilter ? groupFilter.split(",").filter(Boolean) : null;

  if (!stateAbbr || !STATE_TO_FIPS[stateAbbr]) {
    return NextResponse.json({ error: "Invalid or missing state param" }, { status: 400 });
  }

  const totalCounties = getCountyCount(stateAbbr);

  const groups = await prisma.group.findMany({
    where: filterGroupIds ? { id: { in: filterGroupIds } } : undefined,
    include: {
      reps: {
        include: {
          territories: {
            where: { stateAbbr },
          },
        },
      },
    },
  });

  if (viewMode === "rep") {
    const repRows: {
      repId: string;
      repName: string;
      groupName: string;
      groupColor: string;
      hasStateLevel: boolean;
      countiesCovered: number;
      totalCounties: number;
      completenessPct: number;
    }[] = [];

    for (const g of groups) {
      for (const rep of g.reps) {
        const hasStateLevel = rep.territories.some((t) => t.level === "STATE");
        const countyFips = new Set(
          rep.territories.filter((t) => t.level === "COUNTY" && t.countyFips).map((t) => t.countyFips)
        );
        const countiesCovered = countyFips.size;
        const pct = hasStateLevel
          ? 100
          : totalCounties > 0
            ? Math.min(100, (countiesCovered / totalCounties) * 100)
            : 0;

        if (hasStateLevel || countiesCovered > 0) {
          repRows.push({
            repId: rep.id,
            repName: rep.name,
            groupName: g.name,
            groupColor: g.colorHex,
            hasStateLevel,
            countiesCovered,
            totalCounties,
            completenessPct: Math.round(pct * 10) / 10,
          });
        }
      }
    }

    repRows.sort((a, b) => b.completenessPct - a.completenessPct);
    return NextResponse.json({ stateAbbr, totalCounties, mode: "rep", rows: repRows });
  }

  // group mode
  const groupRows: {
    groupId: string;
    groupName: string;
    groupColor: string;
    hasStateLevel: boolean;
    countiesCovered: number;
    totalCounties: number;
    completenessPct: number;
  }[] = [];

  for (const g of groups) {
    let hasStateLevel = false;
    const allCountyFips = new Set<string>();

    for (const rep of g.reps) {
      if (rep.territories.some((t) => t.level === "STATE")) {
        hasStateLevel = true;
      }
      for (const t of rep.territories) {
        if (t.level === "COUNTY" && t.countyFips) allCountyFips.add(t.countyFips);
      }
    }

    const countiesCovered = allCountyFips.size;
    const isFullState = hasStateLevel && g.servicesWholeState;
    const pct = isFullState
      ? 100
      : totalCounties > 0
        ? Math.min(100, (countiesCovered / totalCounties) * 100)
        : 0;

    if (isFullState || countiesCovered > 0 || hasStateLevel) {
      groupRows.push({
        groupId: g.id,
        groupName: g.name,
        groupColor: g.colorHex,
        hasStateLevel,
        countiesCovered,
        totalCounties,
        completenessPct: Math.round(pct * 10) / 10,
      });
    }
  }

  groupRows.sort((a, b) => b.completenessPct - a.completenessPct);
  return NextResponse.json({ stateAbbr, totalCounties, mode: "group", rows: groupRows });
}
