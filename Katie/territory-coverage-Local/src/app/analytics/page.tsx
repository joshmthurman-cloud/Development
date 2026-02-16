"use client";

import { useEffect, useState, useMemo } from "react";
import { VPTopNav } from "@/components/vp-dashboard/VPTopNav";
import { T } from "@/lib/theme";

/* ---------- types ---------- */

interface SummaryData {
  totalCoveredStates: number;
  coveragePct: number;
  uncoveredStates: { abbr: string; name: string }[];
  uncoveredCount: number;
  overlappedCount: number;
  overlapRate: number;
  mostContested: { stateAbbr: string; stateName: string; groupsCovering: number; repsCovering: number } | null;
  groupStats: { groupId: string; groupName: string; groupColor: string; repCount: number; statesCovered: number }[];
  repStats: { repId: string; repName: string; groupId: string; groupName: string; groupColor: string; statesCovered: number }[];
  topGroups: { groupId: string; groupName: string; groupColor: string; statesCovered: number }[];
  topReps: { repId: string; repName: string; groupColor: string; statesCovered: number }[];
  contestedStates: { stateAbbr: string; stateName: string; groupsCovering: number; repsCovering: number; isOverlapped: boolean }[];
  overlapPairs: { groupA: string; groupB: string; colorA: string; colorB: string; count: number }[];
  groupConcentration: { groupId: string; groupName: string; groupColor: string; topRepName: string; concentrationPct: number }[];
}

/* ---------- helpers ---------- */

function ColorDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      className="rounded-full shrink-0 inline-block"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: T.cardBg, border: `1px solid ${T.border}`, boxShadow: T.cardShadow }}
    >
      <p className="text-[10px] uppercase tracking-[0.12em] font-medium mb-1" style={{ color: T.textMuted }}>
        {label}
      </p>
      <p className="text-2xl font-semibold tabular-nums" style={{ color: T.textPrimary }}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px] mt-0.5" style={{ color: T.textMuted }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-[14px] h-[14px] rounded-full text-[9px] font-bold cursor-help shrink-0 select-none"
        style={{ background: "rgba(255,255,255,0.08)", color: T.textMuted }}
      >
        i
      </button>
      {open && (
        <span
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 px-3 py-2 rounded-lg text-[11px] leading-relaxed font-normal normal-case tracking-normal z-50 shadow-lg"
          style={{ background: "#1a2744", color: T.textSecondary, border: `1px solid ${T.border}` }}
        >
          {text}
          <span
            className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
            style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1a2744" }}
          />
        </span>
      )}
    </span>
  );
}

function SectionTitle({ children, tooltip }: { children: React.ReactNode; tooltip?: string }) {
  return (
    <h3 className="text-[10px] uppercase tracking-[0.12em] font-medium mb-3 flex items-center gap-1.5" style={{ color: T.textMuted }}>
      {children}
      {tooltip && <InfoTip text={tooltip} />}
    </h3>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`text-[10px] uppercase tracking-wider font-medium py-2.5 px-3 ${right ? "text-right" : "text-left"}`}
      style={{ color: T.textMuted, borderBottom: `1px solid ${T.rowBorder}` }}
    >
      {children}
    </th>
  );
}

function Td({ children, right, bold }: { children: React.ReactNode; right?: boolean; bold?: boolean }) {
  return (
    <td
      className={`text-sm py-2.5 px-3 ${right ? "text-right tabular-nums" : ""} ${bold ? "font-semibold" : ""}`}
      style={{ color: bold ? T.textPrimary : T.textSecondary, borderBottom: `1px solid ${T.rowBorder}` }}
    >
      {children}
    </td>
  );
}

/* ---------- page ---------- */

export default function AnalyticsPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUncovered, setShowUncovered] = useState(false);

  useEffect(() => {
    fetch("/api/analytics/summary")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const groupConcentrationMap = useMemo(() => {
    if (!data) return new Map<string, { topRepName: string; concentrationPct: number }>();
    const m = new Map<string, { topRepName: string; concentrationPct: number }>();
    for (const gc of data.groupConcentration) {
      m.set(gc.groupId, { topRepName: gc.topRepName, concentrationPct: gc.concentrationPct });
    }
    return m;
  }, [data]);

  const trHoverStyle = `
    [data-analytics-table] tbody tr { transition: background-color 150ms ease; }
    [data-analytics-table] tbody tr:hover { background-color: ${T.tableRowHover}; }
  `;

  return (
    <div className="min-h-screen" style={{ background: T.pageBg }}>
      <style dangerouslySetInnerHTML={{ __html: trHoverStyle }} />

      <div
        className="mx-auto flex flex-col overflow-hidden min-h-screen max-w-[1440px]"
        style={{ background: T.shellBg }}
      >
        <VPTopNav />

        {loading || !data ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <p className="text-sm" style={{ color: T.textMuted }}>Loading analytics…</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {/* Page header row — matches Overview */}
            <div
              className="px-5 py-3 flex items-center justify-between shrink-0"
              style={{ borderBottom: `1px solid ${T.border}` }}
            >
              <div>
                <h1 className="text-sm font-semibold uppercase tracking-wide" style={{ color: T.textPrimary }}>
                  Analytics
                </h1>
                <p className="text-[11px] mt-0.5" style={{ color: T.textMuted }}>Coverage &amp; Overlap</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium"
                  style={{ background: "rgba(59,130,246,0.15)", color: "#93bbfc" }}
                >
                  Covered: {data.totalCoveredStates}
                </span>
                <span
                  className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium"
                  style={{ background: "rgba(234,179,8,0.15)", color: "#fbbf24" }}
                >
                  Overlapped: {data.overlappedCount}
                </span>
                <span
                  className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }}
                >
                  Coverage: {data.coveragePct}%
                </span>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KpiCard label="Covered States" value={data.totalCoveredStates} sub={`of 51`} />
                <KpiCard label="Coverage %" value={`${data.coveragePct}%`} />
                <KpiCard label="Uncovered" value={data.uncoveredCount} sub={
                  data.uncoveredCount > 0
                    ? showUncovered ? "click to hide" : "click to view"
                    : undefined
                } />
                <KpiCard label="Overlapped States" value={data.overlappedCount} />
                <KpiCard label="Overlap Rate" value={`${data.overlapRate}%`} />
                <KpiCard
                  label="Most Contested"
                  value={data.mostContested?.stateAbbr ?? "—"}
                  sub={data.mostContested ? `${data.mostContested.groupsCovering} groups · ${data.mostContested.repsCovering} reps` : undefined}
                />
              </div>

              {/* Uncovered list (toggle) */}
              {data.uncoveredCount > 0 && (
                <div>
                  <button
                    onClick={() => setShowUncovered((v) => !v)}
                    className="text-[11px] font-medium underline transition-colors hover:opacity-80"
                    style={{ color: T.textMuted }}
                  >
                    {showUncovered ? "Hide" : "Show"} uncovered states ({data.uncoveredCount})
                  </button>
                  {showUncovered && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {data.uncoveredStates.map((s) => (
                        <span
                          key={s.abbr}
                          className="inline-flex items-center h-6 px-2 rounded text-[11px]"
                          style={{ background: "rgba(255,255,255,0.06)", color: T.textSecondary }}
                        >
                          {s.abbr}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Main 2-column grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* LEFT COL */}
                <div className="space-y-5">
                  {/* States Covered by Group */}
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ border: `1px solid ${T.border}`, background: T.tableBg, boxShadow: T.cardShadow }}
                  >
                    <div className="px-4 py-3" style={{ background: T.cardBg, borderBottom: `1px solid ${T.rowBorder}` }}>
                      <SectionTitle tooltip="Shows how many unique states each group services. This helps identify footprint size, regional strength, and potential imbalance across groups.">States Covered by Group</SectionTitle>
                    </div>
                    <div className="overflow-x-auto" data-analytics-table>
                      <table className="w-full text-left">
                        <thead>
                          <tr>
                            <Th>Group</Th>
                            <Th right>Reps</Th>
                            <Th right>States</Th>
                            <Th right>Concentration %</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.groupStats.map((g, i) => {
                            const conc = groupConcentrationMap.get(g.groupId);
                            return (
                              <tr key={g.groupId} style={i < 5 ? { background: T.highlight } : undefined}>
                                <Td>
                                  <span className="flex items-center gap-2">
                                    <ColorDot color={g.groupColor} />
                                    <span className="text-sm font-medium truncate" style={{ color: T.textPrimary }}>{g.groupName}</span>
                                  </span>
                                </Td>
                                <Td right>{g.repCount}</Td>
                                <Td right bold>{g.statesCovered}</Td>
                                <Td right>{conc ? `${Math.round(conc.concentrationPct)}%` : "—"}</Td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Overlap Pairs */}
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ border: `1px solid ${T.border}`, background: T.tableBg, boxShadow: T.cardShadow }}
                  >
                    <div className="px-4 py-3" style={{ background: T.cardBg, borderBottom: `1px solid ${T.rowBorder}` }}>
                      <SectionTitle tooltip="Displays the pairs of groups that share the most states in common. This reveals where territorial overlap is highest and helps identify potential channel conflict or coordination needs.">Overlap Pairs (Top 10)</SectionTitle>
                    </div>
                    {data.overlapPairs.length === 0 ? (
                      <p className="px-4 py-4 text-xs" style={{ color: T.textMuted }}>
                        No overlapping groups found.
                      </p>
                    ) : (
                      <div className="overflow-x-auto" data-analytics-table>
                        <table className="w-full text-left">
                          <thead>
                            <tr>
                              <Th>Group A</Th>
                              <Th>Group B</Th>
                              <Th right>Shared States</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.overlapPairs.map((p, i) => (
                              <tr key={i}>
                                <Td>
                                  <span className="flex items-center gap-2">
                                    <ColorDot color={p.colorA} />
                                    <span className="truncate" style={{ color: T.textSecondary }}>{p.groupA}</span>
                                  </span>
                                </Td>
                                <Td>
                                  <span className="flex items-center gap-2">
                                    <ColorDot color={p.colorB} />
                                    <span className="truncate" style={{ color: T.textSecondary }}>{p.groupB}</span>
                                  </span>
                                </Td>
                                <Td right bold>{p.count}</Td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COL */}
                <div className="space-y-5">
                  {/* States Covered by Rep */}
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ border: `1px solid ${T.border}`, background: T.tableBg, boxShadow: T.cardShadow }}
                  >
                    <div className="px-4 py-3" style={{ background: T.cardBg, borderBottom: `1px solid ${T.rowBorder}` }}>
                      <SectionTitle tooltip="Shows how many unique states each individual rep covers. This highlights workload distribution and identifies reps with unusually large or small territory assignments.">States Covered by Rep</SectionTitle>
                    </div>
                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto" data-analytics-table>
                      <table className="w-full text-left">
                        <thead className="sticky top-0" style={{ background: T.tableBg }}>
                          <tr>
                            <Th>Rep</Th>
                            <Th>Group</Th>
                            <Th right>States</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.repStats.map((r, i) => (
                            <tr key={r.repId} style={i < 5 ? { background: T.highlight } : undefined}>
                              <Td>
                                <span className="text-sm font-medium truncate block max-w-[140px]" style={{ color: T.textPrimary }}>{r.repName}</span>
                              </Td>
                              <Td>
                                <span className="flex items-center gap-1.5">
                                  <ColorDot color={r.groupColor} size={8} />
                                  <span className="text-xs truncate max-w-[100px]" style={{ color: T.textMuted }}>
                                    {r.groupName}
                                  </span>
                                </span>
                              </Td>
                              <Td right bold>{r.statesCovered}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Most Contested States */}
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ border: `1px solid ${T.border}`, background: T.tableBg, boxShadow: T.cardShadow }}
                  >
                    <div className="px-4 py-3" style={{ background: T.cardBg, borderBottom: `1px solid ${T.rowBorder}` }}>
                      <SectionTitle tooltip="Lists the states covered by the highest number of groups or reps. These states represent the most competitive or operationally complex regions in your footprint.">Most Contested States (Top 10)</SectionTitle>
                    </div>
                    <div className="overflow-x-auto" data-analytics-table>
                      <table className="w-full text-left">
                        <thead>
                          <tr>
                            <Th>State</Th>
                            <Th right>Groups</Th>
                            <Th right>Reps</Th>
                            <Th right>Overlap</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.contestedStates.map((s) => (
                            <tr key={s.stateAbbr}>
                              <Td>
                                <span className="font-medium" style={{ color: T.textPrimary }}>{s.stateAbbr}</span>
                                <span className="ml-1.5 text-xs" style={{ color: T.textMuted }}>
                                  {s.stateName}
                                </span>
                              </Td>
                              <Td right bold>{s.groupsCovering}</Td>
                              <Td right>{s.repsCovering}</Td>
                              <Td right>
                                {s.isOverlapped ? (
                                  <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium text-white" style={{ background: "var(--vp-warning)" }}>
                                    Yes
                                  </span>
                                ) : (
                                  <span className="text-xs" style={{ color: T.textMuted }}>No</span>
                                )}
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
