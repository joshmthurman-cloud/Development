import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const US_STATE_ABBREVS = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]);

const STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY",
};

const REGION_TO_STATES: Record<string, string[]> = {
  "tampa": ["FL"], "north fl": ["FL"], "south west fl": ["FL"], "south east fl": ["FL"],
  "fl keys": ["FL"], "panhandle fl": ["FL"], "southern california": ["CA"],
  "northern ca": ["CA"], "northern california": ["CA"], "southern california (la/ventura": ["CA"],
  "central coast": ["CA"], "las vegas": ["NV"], "st george": ["UT"], "ut & las vegas": ["UT", "NV"],
  "various": [], "key accounts": [], "rover": [], "new business development": [],
  "southern nj": ["NJ"], "eastern pa": ["PA"], "western pa": ["PA"], "southern ct": ["CT"],
  "northen ct": ["CT"], "northern ct": ["CT"], "hudson valley": ["NY"], "metro ny": ["NY"],
  "northern nj": ["NJ"], "metro san antonio": ["TX"], "metro dallas": ["TX"],
  "metro austin": ["TX"], "metro houston": ["TX"], "metro atlanta": ["GA"],
  "south boston": ["MA"], "south shore": ["MA"], "cape cod": ["MA"], "north boston": ["MA"],
  "north shore": ["MA"], "upstate ny": ["NY"], "central nc": ["NC"], "so. va": ["VA"],
  "central mass": ["MA"], "western mass": ["MA"], "parts of ri": ["RI"],
  "sw washington": ["WA"], "western oregon": ["OR"], "wisconsin and minnesota": ["WI", "MN"],
  "colorado & wyoming": ["CO", "WY"], "southern nj, eastern pa": ["NJ", "PA"],
  "southern nj, eastern pa, md, de": ["NJ", "PA", "MD", "DE"],
};

function parseTerritoryToStates(territory: string): string[] {
  const t = territory.trim();
  const states = new Set<string>();

  const twoLetter = t.match(/\b([A-Z]{2})\b/gi);
  if (twoLetter) {
    for (const s of twoLetter) {
      const abbr = s.toUpperCase();
      if (US_STATE_ABBREVS.has(abbr)) states.add(abbr);
    }
  }

  const lower = t.toLowerCase();
  for (const [region, sts] of Object.entries(REGION_TO_STATES)) {
    if (lower.includes(region)) for (const st of sts) states.add(st);
  }

  for (const [name, abbr] of Object.entries(STATE_NAME_TO_ABBR)) {
    if (lower.includes(name)) states.add(abbr);
  }

  if (lower.includes("fl") || lower.includes("florida")) states.add("FL");
  if (lower.includes("ca") || lower.includes("california")) states.add("CA");
  if (lower.includes("tx") || lower.includes("texas")) states.add("TX");
  if (lower.includes("ga") || lower.includes("georgia")) states.add("GA");
  if (lower.includes("nc") || lower.includes("north carolina")) states.add("NC");
  if (lower.includes("sc") || lower.includes("south carolina")) states.add("SC");
  if (lower.includes("va") || lower.includes("virginia")) states.add("VA");
  if (lower.includes("ma") || lower.includes("massachusetts")) states.add("MA");
  if (lower.includes("nj") || lower.includes("new jersey")) states.add("NJ");
  if (lower.includes("ny") || lower.includes("new york")) states.add("NY");
  if (lower.includes("pa") || lower.includes("pennsylvania")) states.add("PA");
  if (lower.includes("ct") || lower.includes("connecticut")) states.add("CT");
  if (lower.includes("ri") || lower.includes("rhode island")) states.add("RI");
  if (lower.includes("me") || lower.includes("maine")) states.add("ME");
  if (lower.includes("nh") || lower.includes("new hampshire")) states.add("NH");
  if (lower.includes("vt") || lower.includes("vermont")) states.add("VT");

  return Array.from(states);
}

const REP_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
  "#14B8A6", "#A855F7", "#E11D48", "#0EA5E9", "#22C55E",
];

function deterministicColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return REP_COLORS[Math.abs(hash) % REP_COLORS.length];
}

const GROUP_COLORS = [
  "#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED",
  "#DB2777", "#0891B2", "#65A30D", "#EA580C", "#4F46E5",
];

function deterministicGroupColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

async function main() {
  const passwordHash = await bcrypt.hash("iloveyou", 10);
  await prisma.user.upsert({
    where: { username: "kpursel3" },
    update: { passwordHash },
    create: { username: "kpursel3", passwordHash },
  });

  const rosterPath = path.join(process.cwd(), "data", "import", "roster.csv");
  const csv = fs.readFileSync(rosterPath, "utf-8");
  const lines = csv.split("\n").filter((l) => l.trim());
  const headers = lines[0].split(",").map((h) => h.trim());
  const nameIdx = headers.indexOf("Name");
  const groupIdx = headers.indexOf("Group");
  const territoryIdx = headers.indexOf("Territory");

  if (nameIdx < 0 || groupIdx < 0 || territoryIdx < 0) {
    throw new Error("CSV must have Name, Group, Territory columns");
  }

  const groupMap = new Map<string, string>();
  const repMap = new Map<string, string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parsed = parseCSVLine(line);
    const name = parsed[nameIdx]?.trim() ?? "";
    const groupName = (parsed[groupIdx] ?? "").trim();
    const territory = (parsed[territoryIdx] ?? "").trim();

    if (!name || !groupName) continue;

    let groupId = groupMap.get(groupName);
    if (!groupId) {
      const group = await prisma.group.upsert({
        where: { name: groupName },
        update: {},
        create: {
          name: groupName,
          colorHex: deterministicGroupColor(groupName),
        },
      });
      groupId = group.id;
      groupMap.set(groupName, groupId);
    }

    const rep = await prisma.rep.upsert({
      where: { groupId_name: { groupId, name } },
      update: {},
      create: {
        name,
        groupId,
        repColorHex: deterministicColor(name),
      },
    });

    const repId = rep.id;
    repMap.set(`${groupId}-${name}`, repId);

    const states = parseTerritoryToStates(territory);
    for (const stateAbbr of states) {
      await prisma.territory.upsert({
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
    }
  }

  console.log("Seed complete.");
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === ",") {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
