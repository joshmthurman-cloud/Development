"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { TerritoryMap, type TerritoryData, type MapMode } from "@/components/TerritoryMap";
import { Menu, PanelRightClose, PanelRightOpen } from "lucide-react";
import { VPTopNav } from "@/components/vp-dashboard/VPTopNav";
import { VPLeftRail } from "@/components/vp-dashboard/VPLeftRail";
import { VPMapHeaderStrip } from "@/components/vp-dashboard/VPMapHeaderStrip";
import { VPRightPanel, type StateDetail, type AggregateTotals } from "@/components/vp-dashboard/VPRightPanel";
import { T } from "@/lib/theme";

interface Group {
  id: string;
  name: string;
  colorHex: string;
  servicesWholeState: boolean;
  reps: Rep[];
}

interface Rep {
  id: string;
  name: string;
  repColorHex: string | null;
  totalAmountOfSales: number | null;
  numberOfDealers: number | null;
  housingMarketShare: number | null;
  territories: { stateAbbr: string; level: string; countyFips: string }[];
}

export default function DashboardPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [leftRailOpen, setLeftRailOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [zoomToStateTrigger, setZoomToStateTrigger] = useState(0);

  const fetchGroups = () => {
    fetch("/api/groups", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setGroups(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchGroups();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const selectedGroups = useMemo(
    () => groups.filter((g) => selectedGroupIds.has(g.id)),
    [groups, selectedGroupIds]
  );

  const { stateData, countyData, overlapStates, overlapCounties, mode, legendItems } = useMemo(() => {
    const stateData = new Map<string, TerritoryData>();
    const countyData = new Map<string, Map<string, TerritoryData>>();
    const overlapStates = new Set<string>();
    const overlapCounties = new Set<string>();
    let legendItems: { name: string; color: string }[] = [];
    let mode: MapMode = "group";

    const getRepStateCoverage = (territories: { stateAbbr: string; level: string; countyFips: string }[]) => {
      const byState = new Map<string, { hasState: boolean; countyFips: string[] }>();
      for (const t of territories) {
        if (!t.stateAbbr) continue;
        let entry = byState.get(t.stateAbbr);
        if (!entry) {
          entry = { hasState: false, countyFips: [] };
          byState.set(t.stateAbbr, entry);
        }
        if (t.level === "STATE") entry.hasState = true;
        if (t.level === "COUNTY" && t.countyFips) entry.countyFips.push(t.countyFips);
      }
      return byState;
    };

    if (selectedGroupIds.size === 0 || selectedGroupIds.size > 1) {
      mode = "group";
      for (const g of selectedGroups) {
        legendItems.push({ name: g.name, color: g.colorHex });
        for (const rep of g.reps) {
          const coverage = getRepStateCoverage(rep.territories);
          for (const [stateAbbr, { hasState, countyFips }] of coverage) {
            const showState = hasState;
            const showCountiesOnly = !hasState && countyFips.length > 0;
            if (showState) {
              const existing = stateData.get(stateAbbr);
              if (existing) {
                const idx = existing.groups!.findIndex((x) => x.name === g.name);
                if (idx < 0) {
                  existing.groups!.push({
                    name: g.name,
                    colorHex: g.colorHex,
                    reps: [{ name: rep.name, colorHex: rep.repColorHex || g.colorHex }],
                  });
                  overlapStates.add(stateAbbr);
                } else {
                  existing.groups![idx].reps.push({
                    name: rep.name,
                    colorHex: rep.repColorHex || g.colorHex,
                  });
                  overlapStates.add(stateAbbr);
                }
              } else {
                stateData.set(stateAbbr, {
                  stateAbbr,
                  color: g.colorHex,
                  groups: [
                    {
                      name: g.name,
                      colorHex: g.colorHex,
                      reps: [{ name: rep.name, colorHex: rep.repColorHex || g.colorHex }],
                    },
                  ],
                });
              }
            }
            if (showCountiesOnly) {
              for (const fips of countyFips) {
                const fips5 = fips.padStart(5, "0");
                const key = `${stateAbbr}:${fips5}`;
                let stateMap = countyData.get(stateAbbr);
                if (!stateMap) {
                  stateMap = new Map();
                  countyData.set(stateAbbr, stateMap);
                }
                const existing = stateMap.get(fips5);
                const entry: TerritoryData = {
                  stateAbbr,
                  color: g.colorHex,
                  groups: [{
                    name: g.name,
                    colorHex: g.colorHex,
                    reps: [{ name: rep.name, colorHex: rep.repColorHex || g.colorHex }],
                  }],
                };
                if (existing) {
                  const idx = existing.groups!.findIndex((x) => x.name === g.name);
                  if (idx < 0) {
                    existing.groups!.push(entry.groups![0]);
                    overlapCounties.add(key);
                  } else {
                    existing.groups![idx].reps.push(entry.groups![0].reps[0]);
                    overlapCounties.add(key);
                  }
                } else {
                  stateMap.set(fips5, entry);
                }
              }
            }
          }
        }
      }
    } else {
      mode = "rep";
      const g = selectedGroups[0];
      if (g) {
        for (const rep of g.reps) {
          legendItems.push({
            name: rep.name,
            color: rep.repColorHex || g.colorHex,
          });
          const coverage = getRepStateCoverage(rep.territories);
          for (const [stateAbbr, { hasState, countyFips }] of coverage) {
            if (hasState) {
              const existing = stateData.get(stateAbbr);
              if (existing) {
                existing.reps!.push({
                  name: rep.name,
                  colorHex: rep.repColorHex || g.colorHex,
                });
              } else {
                stateData.set(stateAbbr, {
                  stateAbbr,
                  color: g.colorHex,
                  reps: [{ name: rep.name, colorHex: rep.repColorHex || g.colorHex }],
                });
              }
            } else if (countyFips.length > 0) {
              for (const fips of countyFips) {
                const fips5 = fips.padStart(5, "0");
                let stateMap = countyData.get(stateAbbr);
                if (!stateMap) {
                  stateMap = new Map();
                  countyData.set(stateAbbr, stateMap);
                }
                const existing = stateMap.get(fips5);
                const entry: TerritoryData = {
                  stateAbbr,
                  color: g.colorHex,
                  reps: [{ name: rep.name, colorHex: rep.repColorHex || g.colorHex }],
                };
                if (existing) {
                  existing.reps!.push(entry.reps![0]);
                } else {
                  stateMap.set(fips5, entry);
                }
              }
            }
          }
        }
      }
    }

    return {
      stateData,
      countyData,
      overlapStates,
      overlapCounties,
      mode: mode as MapMode,
      legendItems,
    };
  }, [selectedGroups, selectedGroupIds]);

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleSelectAll = () => setSelectedGroupIds(new Set(groups.map((g) => g.id)));
  const handleClearAll = () => setSelectedGroupIds(new Set());

  const stateToGroupIds = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const g of groups) {
      for (const rep of g.reps) {
        for (const t of rep.territories) {
          if (!t.stateAbbr) continue;
          let set = map.get(t.stateAbbr);
          if (!set) {
            set = new Set();
            map.set(t.stateAbbr, set);
          }
          set.add(g.id);
        }
      }
    }
    return map;
  }, [groups]);

  const handleStateClick = useCallback(
    (stateAbbr: string) => {
      setSelectedState((prev) => {
        if (prev === stateAbbr) return null;

        const coveredBySelected = stateData.has(stateAbbr);
        if (!coveredBySelected) {
          const groupIds = stateToGroupIds.get(stateAbbr);
          if (groupIds && groupIds.size > 0) {
            setSelectedGroupIds((prev) => {
              const next = new Set(prev);
              for (const gid of groupIds) next.add(gid);
              return next;
            });
          }
        }

        return stateAbbr;
      });
    },
    [stateData, stateToGroupIds]
  );

  const selectedStateData = useMemo(() => {
    if (!selectedState) return null;
    const stateDataEntry = stateData.get(selectedState);
    const countyEntries = countyData.get(selectedState);
    const countyCount = countyEntries?.size ?? 0;
    const hasCoverage = stateDataEntry || countyCount > 0;
    const aggregatedGroups = new Map<string, { colorHex: string; reps: { name: string; colorHex: string }[] }>();
    const aggregatedReps: { name: string; colorHex: string }[] = [];
    if (stateDataEntry?.groups) {
      for (const g of stateDataEntry.groups) {
        aggregatedGroups.set(g.name, { colorHex: g.colorHex, reps: [...g.reps] });
      }
    }
    if (stateDataEntry?.reps) {
      for (const r of stateDataEntry.reps) {
        if (!aggregatedReps.some((x) => x.name === r.name)) aggregatedReps.push(r);
      }
    }
    if (countyEntries) {
      for (const [, data] of countyEntries) {
        for (const g of data.groups ?? []) {
          const existing = aggregatedGroups.get(g.name);
          if (existing) {
            for (const r of g.reps) {
              if (!existing.reps.some((x) => x.name === r.name)) existing.reps.push(r);
            }
          } else {
            aggregatedGroups.set(g.name, { colorHex: g.colorHex, reps: [...g.reps] });
          }
        }
        for (const r of data.reps ?? []) {
          if (!aggregatedReps.some((x) => x.name === r.name)) aggregatedReps.push(r);
        }
      }
    }
    return {
      stateAbbr: selectedState,
      stateData: stateDataEntry,
      countyCount,
      hasCoverage,
      aggregatedGroups: [...aggregatedGroups.entries()].map(([name, g]) => ({ name, ...g })),
      aggregatedReps,
    };
  }, [selectedState, stateData, countyData]);

  const stateDetail = useMemo((): StateDetail | null => {
    if (!selectedState || !selectedStateData) return null;
    const hasOverlap =
      overlapStates.has(selectedState) ||
      [...overlapCounties].some((k) => k.startsWith(`${selectedState}:`));

    const repNames = new Set<string>();
    for (const g of selectedStateData.aggregatedGroups) {
      for (const r of g.reps) repNames.add(r.name);
    }
    for (const r of selectedStateData.aggregatedReps) repNames.add(r.name);

    let totalSales = 0;
    let totalDealers = 0;
    let totalHousingShare = 0;
    let repCount = 0;
    for (const g of selectedGroups) {
      for (const rep of g.reps) {
        if (!repNames.has(rep.name)) continue;
        totalSales += rep.totalAmountOfSales ?? 0;
        totalDealers += rep.numberOfDealers ?? 0;
        totalHousingShare += rep.housingMarketShare ?? 0;
        repCount++;
      }
    }

    const repLookup = new Map<string, Rep>();
    for (const g of selectedGroups) {
      for (const rep of g.reps) repLookup.set(rep.name, rep);
    }

    const groupsWithSales = selectedStateData.aggregatedGroups.map((g) => ({
      ...g,
      reps: g.reps.map((r) => ({
        ...r,
        totalAmountOfSales: repLookup.get(r.name)?.totalAmountOfSales ?? undefined,
      })),
    }));

    return {
      stateAbbr: selectedState,
      groups: groupsWithSales,
      reps: selectedStateData.aggregatedReps,
      countyCount: selectedStateData.countyCount,
      hasCoverage: !!selectedStateData.hasCoverage,
      hasOverlap,
      totalAmountOfSales: totalSales,
      numberOfDealers: totalDealers,
      housingMarketShare: repCount > 0 ? totalHousingShare / repCount : 0,
    };
  }, [selectedState, selectedStateData, overlapStates, overlapCounties, selectedGroups]);

  const aggregateTotals = useMemo((): AggregateTotals | null => {
    if (selectedGroups.length === 0) return null;
    let totalReps = 0;
    let totalSales = 0;
    let totalDealers = 0;
    let totalHousingShare = 0;
    let repCount = 0;
    for (const g of selectedGroups) {
      totalReps += g.reps.length;
      for (const rep of g.reps) {
        totalSales += rep.totalAmountOfSales ?? 0;
        totalDealers += rep.numberOfDealers ?? 0;
        totalHousingShare += rep.housingMarketShare ?? 0;
        repCount++;
      }
    }
    return {
      totalGroups: selectedGroups.length,
      totalReps,
      totalSales,
      totalDealers,
      avgMarketShare: repCount > 0 ? totalHousingShare / repCount : 0,
    };
  }, [selectedGroups]);

  const copyStateCoverageText = useCallback(() => {
    if (!selectedState || !selectedStateData) return;
    const lines: string[] = [`State: ${selectedState}`];
    if (selectedStateData.aggregatedGroups.length > 0) {
      for (const g of selectedStateData.aggregatedGroups) {
        lines.push(`\n${g.name}:`);
        for (const r of g.reps) lines.push(`  - ${r.name}`);
      }
    } else if (selectedStateData.aggregatedReps.length > 0) {
      lines.push("\nReps:");
      for (const r of selectedStateData.aggregatedReps) lines.push(`  - ${r.name}`);
    }
    if (selectedStateData.countyCount > 0) {
      lines.push(`\nCounty-level coverage: ${selectedStateData.countyCount}`);
    }
    if (!selectedStateData.hasCoverage) lines.push("\nNo coverage in this state");
    void navigator.clipboard.writeText(lines.join("\n"));
  }, [selectedState, selectedStateData]);

  const regionCount = selectedGroupIds.size > 0 ? selectedGroups.length : groups.length;
  const dateRange = "Jan 1 – Dec 31, 2025";

  const coveredCount = stateData.size;
  const overlapCount = overlapStates.size;
  const coveragePct = coveredCount > 0 ? Math.round((coveredCount / 50) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: T.pageBg }}>
      {/* Full-width shell */}
      <div
        className="mx-auto flex flex-col overflow-hidden min-h-screen max-w-[1440px]"
        style={{ background: T.shellBg }}
      >
        <VPTopNav />

        {/* Page header row — matches Analytics */}
        <div
          className="px-5 py-3 flex items-center justify-between shrink-0"
          style={{ borderBottom: `1px solid ${T.border}` }}
        >
          <div>
            <h1 className="text-sm font-semibold uppercase tracking-wide" style={{ color: T.textPrimary }}>
              Overview
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: T.textMuted }}>Coverage Map</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium"
              style={{ background: "rgba(59,130,246,0.15)", color: "#93bbfc" }}
            >
              Covered: {coveredCount}
            </span>
            <span
              className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium"
              style={{ background: "rgba(234,179,8,0.15)", color: "#fbbf24" }}
            >
              Overlapped: {overlapCount}
            </span>
            <span
              className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium"
              style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }}
            >
              Coverage: {coveragePct}%
            </span>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left rail: fixed on lg, drawer on small */}
          <div className="hidden lg:block">
            <VPLeftRail
              groups={groups}
              selectedGroupIds={selectedGroupIds}
              onToggleGroup={handleToggleGroup}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
              loading={loading}
            />
          </div>
          {leftRailOpen && (
            <div className="fixed inset-0 z-30 lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setLeftRailOpen(false)} />
              <div className="absolute left-0 top-0 bottom-0 w-[240px] z-40 shadow-xl">
                <VPLeftRail
                  groups={groups}
                  selectedGroupIds={selectedGroupIds}
                  onToggleGroup={handleToggleGroup}
                  onSelectAll={handleSelectAll}
                  onClearAll={handleClearAll}
                  loading={loading}
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setLeftRailOpen(true)}
            className="lg:hidden absolute left-4 top-14 z-20 w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: T.cardBg, color: T.textPrimary }}
            aria-label="Open filters"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Center: map card */}
          <div className="flex-1 flex flex-col min-w-0">
            <VPMapHeaderStrip regionCount={regionCount} dateRange={dateRange} />

            {/* Map canvas */}
            <div
              className="flex-1 min-h-[300px] md:min-h-[420px] relative"
              style={{ borderBottom: `1px solid ${T.rowBorder}` }}
            >
              <TerritoryMap
                mode={mode}
                stateData={stateData}
                countyData={countyData}
                overlapStates={overlapStates}
                overlapCounties={overlapCounties}
                selectedState={selectedState}
                zoomToStateTrigger={zoomToStateTrigger}
                onStateClick={(stateAbbr) => handleStateClick(stateAbbr)}
                onClearState={() => setSelectedState(null)}
              />
              {selectedState && (
                <button
                  type="button"
                  onClick={() => setSelectedState(null)}
                  className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold shadow-sm transition-colors"
                  style={{
                    background: T.cardBg,
                    color: T.textPrimary,
                    border: `1px solid ${T.border}`,
                  }}
                  title="Back to full map"
                  aria-label="Clear state selection"
                >
                  ×
                </button>
              )}
            </div>

            {/* Legend footer */}
            {legendItems.length > 0 && (
              <div
                className="px-4 py-2 flex flex-wrap gap-x-4 gap-y-1"
                style={{ background: T.cardBg, borderTop: `1px solid ${T.rowBorder}` }}
              >
                {legendItems.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-1.5 text-[11px]"
                    style={{ color: T.textMuted }}
                  >
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.name}
                  </div>
                ))}
                {(overlapStates.size > 0 || overlapCounties.size > 0) && (
                  <div
                    className="flex items-center gap-1.5 text-[11px]"
                    style={{ color: T.textMuted }}
                  >
                    <span className="w-3 h-3 rounded-sm shrink-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_2px,#94A3B8_2px,#94A3B8_4px)]" />
                    Overlap
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right panel: fixed on lg */}
          <div className="hidden lg:block">
            <VPRightPanel
              selectedState={selectedState}
              stateDetail={stateDetail}
              aggregateTotals={aggregateTotals}
              onClear={() => setSelectedState(null)}
              onCopy={copyStateCoverageText}
              onZoomToState={() => setZoomToStateTrigger((t) => t + 1)}
            />
          </div>
        </div>

        {/* Mobile: right panel as collapsible section */}
        <div className="lg:hidden" style={{ borderTop: `1px solid ${T.border}` }}>
          <button
            type="button"
            onClick={() => setRightPanelOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium uppercase tracking-wider"
            style={{ background: T.cardBg, color: T.textPrimary }}
          >
            Status &amp; Activity
            {rightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
          {rightPanelOpen && (
            <div className="max-h-[40vh] overflow-auto">
              <VPRightPanel
                selectedState={selectedState}
                stateDetail={stateDetail}
                aggregateTotals={aggregateTotals}
                onClear={() => setSelectedState(null)}
                onCopy={copyStateCoverageText}
                onZoomToState={() => setZoomToStateTrigger((t) => t + 1)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
