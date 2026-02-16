"use client";

import { Copy, X, ZoomIn } from "lucide-react";
import { T } from "@/lib/theme";

const STATE_ABBR_TO_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export interface StateDetail {
  stateAbbr: string;
  groups: { name: string; colorHex: string; reps: { name: string; colorHex: string; totalAmountOfSales?: number }[] }[];
  reps: { name: string; colorHex: string }[];
  countyCount: number;
  hasCoverage: boolean;
  hasOverlap: boolean;
  totalAmountOfSales: number;
  numberOfDealers: number;
  housingMarketShare: number;
}

export interface AggregateTotals {
  totalGroups: number;
  totalReps: number;
  totalSales: number;
  totalDealers: number;
  avgMarketShare: number;
}

interface VPRightPanelProps {
  selectedState?: string | null;
  stateDetail?: StateDetail | null;
  aggregateTotals?: AggregateTotals | null;
  onClear?: () => void;
  onCopy?: () => void;
  onZoomToState?: () => void;
}

function KpiRow({ label, value }: { label: string; value: string | number }) {
  return (
    <li className="flex justify-between items-baseline gap-3 py-1.5">
      <span className="text-[11px] uppercase tracking-wider shrink-0" style={{ color: T.textMuted }}>
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums" style={{ color: T.textPrimary }}>{value}</span>
    </li>
  );
}

function Divider() {
  return <div className="h-px my-3" style={{ background: T.rowBorder }} />;
}

function Chip({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <span
      className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium text-white"
      style={{ background: warn ? "var(--vp-warning)" : "#6b7280" }}
    >
      {children}
    </span>
  );
}

export function VPRightPanel({
  selectedState,
  stateDetail,
  aggregateTotals,
  onClear,
  onCopy,
  onZoomToState,
}: VPRightPanelProps) {
  const stateName = selectedState ? (STATE_ABBR_TO_NAME[selectedState] ?? selectedState) : "";

  return (
    <aside
      className="w-[260px] shrink-0 flex flex-col overflow-hidden"
      style={{
        background: T.cardBg,
        borderLeft: `1px solid ${T.border}`,
        color: T.textPrimary,
      }}
    >
      {/* ===== Overview (no state selected) ===== */}
      {!selectedState || !stateDetail ? (
        <div className="p-5 overflow-auto flex-1">
          <h2 className="text-sm font-semibold mb-1" style={{ color: T.textPrimary }}>Overview</h2>

          {aggregateTotals ? (
            <>
              <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                <Chip>Groups: {aggregateTotals.totalGroups}</Chip>
                <Chip>Reps: {aggregateTotals.totalReps}</Chip>
              </div>

              <Divider />

              <ul className="space-y-0">
                <KpiRow label="Total Groups" value={aggregateTotals.totalGroups} />
                <KpiRow label="Total Reps" value={aggregateTotals.totalReps} />
              </ul>

              <Divider />

              <p className="text-[10px] uppercase tracking-[0.12em] font-medium mb-2" style={{ color: T.textMuted }}>
                Rep Data (All Selected)
              </p>
              <ul className="space-y-0">
                <KpiRow
                  label="Total Sales"
                  value={`$${aggregateTotals.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                <KpiRow label="Num. Dealers" value={aggregateTotals.totalDealers.toLocaleString()} />
                <KpiRow label="Avg. Mkt Share" value={`${aggregateTotals.avgMarketShare.toFixed(1)}%`} />
              </ul>

              <p className="text-[11px] mt-6 text-center leading-relaxed" style={{ color: T.textMuted }}>
                Double-click a state for detailed breakdown.
              </p>
            </>
          ) : (
            <p className="text-xs text-center mt-10 leading-relaxed" style={{ color: T.textMuted }}>
              Select groups to see aggregate data.
            </p>
          )}
        </div>
      ) : (
        /* ===== State detail ===== */
        <div className="p-5 overflow-auto flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h2 className="text-sm font-semibold leading-snug" style={{ color: T.textPrimary }}>
              {stateName}
              <span className="font-normal ml-1" style={{ color: T.textMuted }}>({selectedState})</span>
            </h2>
            <button
              type="button"
              onClick={onClear}
              className="p-1 -mr-1 rounded hover:bg-white/10 transition-colors shrink-0"
              style={{ color: T.textMuted }}
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
            <Chip>Groups: {stateDetail.groups.length}</Chip>
            <Chip>
              Reps: {stateDetail.groups.reduce((n, g) => n + g.reps.length, 0) || stateDetail.reps.length}
            </Chip>
            <Chip warn={stateDetail.hasOverlap}>
              Overlaps: {stateDetail.hasOverlap ? "Yes" : "No"}
            </Chip>
          </div>

          <Divider />

          <ul className="space-y-0">
            <KpiRow label="Groups Covering" value={stateDetail.groups.length} />
            <KpiRow
              label="Reps Covering"
              value={stateDetail.groups.reduce((n, g) => n + g.reps.length, 0) || stateDetail.reps.length}
            />
            {stateDetail.countyCount > 0 && (
              <KpiRow label="County Coverage" value={stateDetail.countyCount} />
            )}
          </ul>

          <Divider />

          <p className="text-[10px] uppercase tracking-[0.12em] font-medium mb-2" style={{ color: T.textMuted }}>
            Rep Data
          </p>
          <ul className="space-y-0">
            <KpiRow
              label="Total Sales"
              value={`$${stateDetail.totalAmountOfSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <KpiRow label="Num. Dealers" value={stateDetail.numberOfDealers.toLocaleString()} />
            <KpiRow label="Housing Mkt Share" value={`${stateDetail.housingMarketShare.toFixed(1)}%`} />
          </ul>

          {stateDetail.groups.length > 0 && (
            <>
              <Divider />
              <p className="text-[10px] uppercase tracking-[0.12em] font-medium mb-2" style={{ color: T.textMuted }}>
                Groups
              </p>
              <ul className="space-y-2.5">
                {stateDetail.groups.map((g) => (
                  <li key={g.name}>
                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: T.textPrimary }}>
                      <span className="w-[10px] h-[10px] rounded-sm shrink-0" style={{ backgroundColor: g.colorHex }} />
                      {g.name}
                    </div>
                    <ul className="mt-1 ml-[18px] space-y-0.5">
                      {g.reps.map((r) => (
                        <li
                          key={r.name}
                          className="flex justify-between items-baseline text-xs py-0.5"
                          style={{ color: T.textMuted }}
                        >
                          <span className="truncate">{r.name}</span>
                          {r.totalAmountOfSales != null && r.totalAmountOfSales > 0 && (
                            <span className="tabular-nums shrink-0 ml-2">
                              ${r.totalAmountOfSales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </>
          )}

          {stateDetail.groups.length === 0 && stateDetail.reps.length > 0 && (
            <>
              <Divider />
              <p className="text-[10px] uppercase tracking-[0.12em] font-medium mb-2" style={{ color: T.textMuted }}>
                Reps
              </p>
              <ul className="space-y-1">
                {stateDetail.reps.map((r) => (
                  <li key={r.name} className="flex items-center gap-2 text-sm py-0.5" style={{ color: T.textSecondary }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.colorHex }} />
                    {r.name}
                  </li>
                ))}
              </ul>
            </>
          )}

          {!stateDetail.hasCoverage && (
            <p className="text-xs mt-3" style={{ color: T.textMuted }}>
              No coverage in this state.
            </p>
          )}

          <Divider />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onZoomToState}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors"
              style={{ background: T.btnBg, color: T.textSecondary, border: `1px solid ${T.border}` }}
            >
              <ZoomIn className="w-3 h-3" /> Zoom
            </button>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors"
              style={{ background: T.btnBg, color: T.textSecondary, border: `1px solid ${T.border}` }}
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
