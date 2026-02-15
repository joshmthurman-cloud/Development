import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const FIPS_TO_STATE: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
  "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
  "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY",
};

const STATE_TO_FIPS: Record<string, string> = Object.fromEntries(
  Object.entries(FIPS_TO_STATE).map(([fips, abbr]) => [abbr, fips])
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const state = (await params).state?.toUpperCase();
  if (!state || !STATE_TO_FIPS[state]) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const localPath = path.join(
    process.cwd(),
    "public",
    "data",
    "geo",
    "counties",
    `${state}.geojson`
  );

  if (fs.existsSync(localPath)) {
    const data = JSON.parse(fs.readFileSync(localPath, "utf-8"));
    return NextResponse.json(data);
  }

  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json"
    );
    const full = await res.json();
    const stateFips = STATE_TO_FIPS[state];
    const filtered = {
      type: "FeatureCollection",
      features: full.features.filter(
        (f: { id: string }) => f.id?.startsWith(stateFips)
      ),
    };

    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localPath, JSON.stringify(filtered));

    return NextResponse.json(filtered);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch county data" },
      { status: 500 }
    );
  }
}
