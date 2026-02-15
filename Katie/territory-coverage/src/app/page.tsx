"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { TerritoryMap, type TerritoryData, type MapMode } from "@/components/TerritoryMap";
import { AppHeader } from "@/components/AppHeader";
import { Checkbox } from "@/components/ui/checkbox";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

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
  territories: { stateAbbr: string; level: string; countyFips: string }[];
}

export default function DashboardPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    const countyData = new Map<string, Map<string, TerritoryData>>(); // stateAbbr -> countyFips -> data
    const overlapStates = new Set<string>();
    const overlapCounties = new Set<string>(); // "stateAbbr:countyFips"
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
        const useExplicitOnly = !g.servicesWholeState;
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
                overlapStates.add(stateAbbr);
              } else {
                stateData.set(stateAbbr, {
                  stateAbbr,
                  color: rep.repColorHex || g.colorHex,
                  reps: [{ name: rep.name, colorHex: rep.repColorHex || g.colorHex }],
                });
              }
            } else if (countyFips.length > 0) {
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
                  color: rep.repColorHex || g.colorHex,
                  reps: [{ name: rep.name, colorHex: rep.repColorHex || g.colorHex }],
                };
                if (existing) {
                  existing.reps!.push(entry.reps![0]);
                  overlapCounties.add(key);
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

  const handleSelectAll = () => {
    setSelectedGroupIds(new Set(groups.map((g) => g.id)));
  };

  const handleClearAll = () => {
    setSelectedGroupIds(new Set());
  };

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

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <AppHeader title="Territory Coverage">
        <Link
          href="/groups"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Groups
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Sign out
        </button>
      </AppHeader>

      <main className="flex-1 min-h-0">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={20} minSize={15} maxSize={35}>
            <div className="h-full overflow-auto p-4 bg-white border-r border-slate-200">
              <h2 className="font-medium text-slate-800 mb-2">Groups</h2>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={handleSelectAll}
                  className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
                >
                  Clear All
                </button>
              </div>
              {loading ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : (
                <div className="space-y-2">
                  {groups.map((g) => (
                    <label
                      key={g.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedGroupIds.has(g.id)}
                        onCheckedChange={() => handleToggleGroup(g.id)}
                      />
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: g.colorHex }}
                      />
                      <span className="text-sm text-slate-700">{g.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Panel>
          <PanelResizeHandle className="w-1 bg-slate-200 hover:bg-slate-300" />
          <Panel defaultSize={80}>
            <div className="h-full flex flex-col p-4">
              <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-slate-200 bg-white relative">
                <TerritoryMap
                  mode={mode}
                  stateData={stateData}
                  countyData={countyData}
                  overlapStates={overlapStates}
                  overlapCounties={overlapCounties}
                  selectedState={selectedState}
                  onStateClick={(stateAbbr) => setSelectedState(stateAbbr)}
                />
                {selectedState && (
                  <div className="absolute top-2 left-2 z-10 bg-white rounded-lg shadow-lg border border-slate-200 p-4 max-w-sm max-h-[70vh] overflow-auto">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-800">{selectedState}</h3>
                      <button
                        onClick={() => setSelectedState(null)}
                        className="text-slate-500 hover:text-slate-700 text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                    {selectedStateData?.hasCoverage ? (
                      <div className="space-y-3 text-sm">
                        {selectedStateData.aggregatedGroups.length > 0 ? (
                          selectedStateData.aggregatedGroups.map((g) => (
                            <div key={g.name} className="border-b border-slate-100 pb-2 last:border-0">
                              <div className="flex items-center gap-2 font-medium text-slate-700">
                                <span
                                  className="w-3 h-3 rounded-sm shrink-0"
                                  style={{ backgroundColor: g.colorHex }}
                                />
                                {g.name}
                              </div>
                              <ul className="mt-1 ml-5 text-slate-600 space-y-0.5">
                                {g.reps.map((r) => (
                                  <li key={r.name}>{r.name}</li>
                                ))}
                              </ul>
                            </div>
                          ))
                        ) : selectedStateData.aggregatedReps.length > 0 ? (
                          <div>
                            <div className="font-medium text-slate-700 mb-1">Reps</div>
                            <ul className="ml-2 text-slate-600 space-y-0.5">
                              {selectedStateData.aggregatedReps.map((r) => (
                                <li key={r.name} className="flex items-center gap-1.5">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: r.colorHex }}
                                  />
                                  {r.name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {selectedStateData.countyCount > 0 && (
                          <p className="text-slate-500 text-xs">
                            + {selectedStateData.countyCount} county-level coverage
                          </p>
                        )}
                        {(selectedStateData.aggregatedGroups.length > 4 ||
                          selectedStateData.aggregatedReps.length > 4) && (
                          <p className="text-slate-500 text-xs">
                            Map shows first 2 colors; +
                            {selectedStateData.aggregatedGroups.length > 0
                              ? selectedStateData.aggregatedGroups.length - 2
                              : selectedStateData.aggregatedReps.length - 2}{" "}
                            more
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">No coverage in this state</p>
                    )}
                  </div>
                )}
              </div>
              {legendItems.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-3">
                  {legendItems.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <span
                        className="w-4 h-4 rounded shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                  ))}
                  {(overlapStates.size > 0 || overlapCounties.size > 0) && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <span className="w-4 h-4 rounded shrink-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_2px,#94a3b8_2px,#94a3b8_4px)]" />
                      <span>Overlap</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </PanelGroup>
      </main>
    </div>
  );
}
