import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALL_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
];

const STATE_NAMES: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",
  FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",
  IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",
  ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",
  MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",
  NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",
  NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
  OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
  SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
  VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const groupFilter = url.searchParams.get("groups");
  const filterGroupIds = groupFilter ? groupFilter.split(",").filter(Boolean) : null;

  const groups = await prisma.group.findMany({
    where: filterGroupIds ? { id: { in: filterGroupIds } } : undefined,
    include: {
      reps: {
        include: { territories: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // --- Derived sets ---

  // rep_state_coverage: Map<repId, Set<stateAbbr>>
  const repStateCoverage = new Map<string, Set<string>>();
  // rep metadata: Map<repId, { name, groupId, groupName, groupColor }>
  const repMeta = new Map<string, { name: string; groupId: string; groupName: string; groupColor: string }>();

  for (const g of groups) {
    for (const rep of g.reps) {
      repMeta.set(rep.id, { name: rep.name, groupId: g.id, groupName: g.name, groupColor: g.colorHex });
      const states = new Set<string>();
      for (const t of rep.territories) {
        if (t.stateAbbr) states.add(t.stateAbbr);
      }
      repStateCoverage.set(rep.id, states);
    }
  }

  // group_state_coverage: Map<groupId, Set<stateAbbr>>
  const groupStateCoverage = new Map<string, Set<string>>();
  for (const g of groups) {
    const states = new Set<string>();
    for (const rep of g.reps) {
      const repStates = repStateCoverage.get(rep.id);
      if (repStates) for (const s of repStates) states.add(s);
    }
    groupStateCoverage.set(g.id, states);
  }

  // state_group_counts + state_rep_counts
  const stateGroupCount = new Map<string, number>();
  const stateRepCount = new Map<string, number>();
  const stateGroups = new Map<string, Set<string>>();

  for (const [groupId, states] of groupStateCoverage) {
    for (const s of states) {
      stateGroupCount.set(s, (stateGroupCount.get(s) ?? 0) + 1);
      let gs = stateGroups.get(s);
      if (!gs) { gs = new Set(); stateGroups.set(s, gs); }
      gs.add(groupId);
    }
  }
  for (const [, states] of repStateCoverage) {
    for (const s of states) {
      stateRepCount.set(s, (stateRepCount.get(s) ?? 0) + 1);
    }
  }

  // --- Metrics ---

  // C) Total covered states
  const coveredStatesSet = new Set<string>();
  for (const [, states] of groupStateCoverage) {
    for (const s of states) coveredStatesSet.add(s);
  }
  const totalCoveredStates = coveredStatesSet.size;

  // D) Uncovered states
  const uncoveredStates = ALL_STATES.filter((s) => !coveredStatesSet.has(s)).map((s) => ({
    abbr: s,
    name: STATE_NAMES[s] ?? s,
  }));

  // G) Coverage %
  const coveragePct = ALL_STATES.length > 0 ? (totalCoveredStates / ALL_STATES.length) * 100 : 0;

  // H) Overlapped states (2+ groups)
  const overlappedStates: string[] = [];
  for (const [state, count] of stateGroupCount) {
    if (count >= 2) overlappedStates.push(state);
  }

  // I) Overlap rate
  const overlapRate = totalCoveredStates > 0 ? (overlappedStates.length / totalCoveredStates) * 100 : 0;

  // A) States covered per group
  const groupStats = groups.map((g) => {
    const states = groupStateCoverage.get(g.id) ?? new Set();
    return {
      groupId: g.id,
      groupName: g.name,
      groupColor: g.colorHex,
      repCount: g.reps.length,
      statesCovered: states.size,
    };
  }).sort((a, b) => b.statesCovered - a.statesCovered);

  // B) States covered per rep
  const repStats = [...repStateCoverage.entries()].map(([repId, states]) => {
    const meta = repMeta.get(repId)!;
    return {
      repId,
      repName: meta.name,
      groupId: meta.groupId,
      groupName: meta.groupName,
      groupColor: meta.groupColor,
      statesCovered: states.size,
    };
  }).sort((a, b) => b.statesCovered - a.statesCovered);

  // E) Top 5 reps
  const topReps = repStats.slice(0, 5);

  // F) Top 5 groups
  const topGroups = groupStats.slice(0, 5);

  // J) Most contested states
  const contestedStates = [...stateGroupCount.entries()]
    .map(([state, groupCount]) => ({
      stateAbbr: state,
      stateName: STATE_NAMES[state] ?? state,
      groupsCovering: groupCount,
      repsCovering: stateRepCount.get(state) ?? 0,
      isOverlapped: groupCount >= 2,
    }))
    .sort((a, b) => b.groupsCovering - a.groupsCovering || b.repsCovering - a.repsCovering)
    .slice(0, 10);

  // K) Overlap pairs
  const pairCounts = new Map<string, { groupA: string; groupB: string; colorA: string; colorB: string; count: number }>();
  for (const [, gids] of stateGroups) {
    const arr = [...gids];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const [a, b] = arr[i] < arr[j] ? [arr[i], arr[j]] : [arr[j], arr[i]];
        const key = `${a}|${b}`;
        const existing = pairCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          const ga = groups.find((g) => g.id === a);
          const gb = groups.find((g) => g.id === b);
          pairCounts.set(key, {
            groupA: ga?.name ?? a,
            groupB: gb?.name ?? b,
            colorA: ga?.colorHex ?? "#888",
            colorB: gb?.colorHex ?? "#888",
            count: 1,
          });
        }
      }
    }
  }
  const overlapPairs = [...pairCounts.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  // L) Group concentration
  const groupConcentration = groups.map((g) => {
    const groupStates = groupStateCoverage.get(g.id) ?? new Set();
    const totalStates = groupStates.size;
    if (totalStates === 0) {
      return { groupId: g.id, groupName: g.name, groupColor: g.colorHex, topRepName: "—", concentrationPct: 0 };
    }

    // For each state, count how many reps in this group cover it
    const stateRepCounts = new Map<string, string[]>();
    for (const rep of g.reps) {
      const repStates = repStateCoverage.get(rep.id) ?? new Set();
      for (const s of repStates) {
        if (!groupStates.has(s)) continue;
        let arr = stateRepCounts.get(s);
        if (!arr) { arr = []; stateRepCounts.set(s, arr); }
        arr.push(rep.id);
      }
    }

    // Count unique states per rep (states where they're the only one)
    const uniquePerRep = new Map<string, number>();
    for (const [, repIds] of stateRepCounts) {
      if (repIds.length === 1) {
        uniquePerRep.set(repIds[0], (uniquePerRep.get(repIds[0]) ?? 0) + 1);
      }
    }

    let topRepId = "";
    let topUnique = 0;
    for (const [repId, count] of uniquePerRep) {
      if (count > topUnique) { topUnique = count; topRepId = repId; }
    }

    const topRepMeta = repMeta.get(topRepId);
    return {
      groupId: g.id,
      groupName: g.name,
      groupColor: g.colorHex,
      topRepName: topRepMeta?.name ?? "—",
      concentrationPct: totalStates > 0 ? (topUnique / totalStates) * 100 : 0,
    };
  });

  // Most contested state
  const mostContested = contestedStates[0] ?? null;

  return NextResponse.json({
    totalCoveredStates,
    coveragePct: Math.round(coveragePct * 10) / 10,
    uncoveredStates,
    uncoveredCount: uncoveredStates.length,
    overlappedCount: overlappedStates.length,
    overlapRate: Math.round(overlapRate * 10) / 10,
    mostContested,
    groupStats,
    repStats,
    topGroups,
    topReps,
    contestedStates,
    overlapPairs,
    groupConcentration,
  });
}
