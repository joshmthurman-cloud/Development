"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { AppHeader } from "@/components/AppHeader";
import { CountyEditorModal } from "@/components/CountyEditorModal";

const STATE_ABBREVS = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

interface Rep {
  id: string;
  name: string;
  repColorHex: string | null;
  group: { name: string; colorHex: string };
  territories: { stateAbbr: string; level: string; countyFips: string }[];
}

export default function RepTerritoryPage() {
  const params = useParams();
  const repId = params.id as string;
  const [rep, setRep] = useState<Rep | null>(null);
  const [loading, setLoading] = useState(true);
  const [countyModalState, setCountyModalState] = useState<string | null>(null);
  const [manageStateAbbr, setManageStateAbbr] = useState<string | null>(null);
  const [addStateOpen, setAddStateOpen] = useState(false);
  const [addStateAbbr, setAddStateAbbr] = useState("");
  const [addWholeState, setAddWholeState] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRep = () => {
    fetch(`/api/reps/${repId}`)
      .then((r) => r.json())
      .then((data) => {
        setRep(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRep();
  }, [repId]);

  const stateTerritories = rep
    ? STATE_ABBREVS.map((abbr) => {
        const stateT = rep.territories.find(
          (t) => t.stateAbbr === abbr && t.level === "STATE"
        );
        const countyT = rep.territories.filter(
          (t) => t.stateAbbr === abbr && t.level === "COUNTY"
        );
        return {
          stateAbbr: abbr,
          hasState: !!stateT,
          countyFips: countyT.map((t) => t.countyFips).filter(Boolean),
        };
      })
    : [];

  const assignedStates = new Set(
    stateTerritories
      .filter((s) => s.hasState || s.countyFips.length > 0)
      .map((s) => s.stateAbbr)
  );
  const availableStates = STATE_ABBREVS.filter((a) => !assignedStates.has(a));

  const handleSaveCounties = async (stateAbbr: string, countyFips: string[]) => {
    setSaving(true);
    try {
      await fetch(`/api/reps/${repId}/territory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateAbbr,
          wholeState: false,
          countyFipsList: countyFips,
        }),
      });
      setCountyModalState(null);
      loadRep();
    } finally {
      setSaving(false);
    }
  };

  const handleAddState = async () => {
    if (!addStateAbbr) return;
    setSaving(true);
    try {
      if (addWholeState) {
        await fetch(`/api/reps/${repId}/territory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stateAbbr: addStateAbbr, wholeState: true }),
        });
        setAddStateOpen(false);
        setAddStateAbbr("");
        loadRep();
      } else {
        await fetch(`/api/reps/${repId}/territory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stateAbbr: addStateAbbr,
            wholeState: false,
            countyFipsList: [],
          }),
        });
        setAddStateOpen(false);
        setAddStateAbbr("");
        loadRep();
        setCountyModalState(addStateAbbr);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToWholeState = async (stateAbbr: string) => {
    setSaving(true);
    try {
      await fetch(`/api/reps/${repId}/territory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateAbbr, wholeState: true }),
      });
      loadRep();
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveState = async (stateAbbr: string) => {
    setSaving(true);
    try {
      await fetch(`/api/reps/${repId}/territory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateAbbr,
          wholeState: false,
          countyFipsList: [],
        }),
      });
      setManageStateAbbr(null);
      loadRep();
    } finally {
      setSaving(false);
    }
  };

  const openCountyEditor = (stateAbbr: string) => {
    setManageStateAbbr(null);
    setCountyModalState(stateAbbr);
  };

  if (loading || !rep) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader title={`Territory: ${rep.name}`}>
        <Link href="/groups" className="text-sm text-slate-600 hover:text-slate-900">
          Groups
        </Link>
        <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
          Dashboard
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Sign out
        </button>
      </AppHeader>

      <main className="p-6 max-w-4xl mx-auto">
        <p className="text-slate-600 mb-4">
          Group: {rep.group.name}
        </p>

        <h2 className="text-lg font-medium text-slate-800 mb-3">States</h2>

        {/* Add State control */}
        <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
          {!addStateOpen ? (
            <button
              onClick={() => setAddStateOpen(true)}
              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add State
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">State:</label>
                <select
                  value={addStateAbbr}
                  onChange={(e) => setAddStateAbbr(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-sm"
                >
                  <option value="">Select...</option>
                  {availableStates.map((abbr) => (
                    <option key={abbr} value={abbr}>
                      {abbr}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm text-slate-600">Coverage:</label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="addCoverage"
                    checked={addWholeState}
                    onChange={() => setAddWholeState(true)}
                  />
                  <span className="text-sm">Whole State</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="addCoverage"
                    checked={!addWholeState}
                    onChange={() => setAddWholeState(false)}
                  />
                  <span className="text-sm">Counties Only</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddState}
                  disabled={!addStateAbbr || saving}
                  className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setAddStateOpen(false);
                    setAddStateAbbr("");
                  }}
                  className="text-sm px-3 py-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {stateTerritories
            .filter((s) => s.hasState || s.countyFips.length > 0)
            .map((s) => (
              <div
                key={s.stateAbbr}
                className="p-3 bg-white rounded-lg border border-slate-200"
              >
                <div className="font-medium text-slate-800">{s.stateAbbr}</div>
                <div className="mt-1">
                  <span
                    className={`inline-block text-xs px-1.5 py-0.5 rounded ${
                      s.hasState
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {s.hasState ? "Whole State" : "Counties Only"}
                  </span>
                </div>
                {s.countyFips.length > 0 && (
                  <div className="text-xs text-slate-500 mt-1">
                    {s.countyFips.length} counties
                  </div>
                )}
                <div className="mt-2">
                  <button
                    onClick={() => setManageStateAbbr(s.stateAbbr)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Manage State
                  </button>
                </div>
              </div>
            ))}
        </div>

        {stateTerritories.filter((s) => s.hasState || s.countyFips.length > 0)
          .length === 0 && (
          <p className="text-slate-500">No territories assigned yet.</p>
        )}
      </main>

      {countyModalState && (
        <CountyEditorModal
          repId={repId}
          stateAbbr={countyModalState}
          initialCountyFips={
            stateTerritories.find((s) => s.stateAbbr === countyModalState)
              ?.countyFips ?? []
          }
          repColor={rep.repColorHex || rep.group.colorHex}
          onSave={(fips) => handleSaveCounties(countyModalState, fips)}
          onClose={() => setCountyModalState(null)}
        />
      )}

      {manageStateAbbr && (() => {
        const s = stateTerritories.find((x) => x.stateAbbr === manageStateAbbr);
        if (!s) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-4">
              <h3 className="text-lg font-medium text-slate-800 mb-3">
                Manage State: {manageStateAbbr}
              </h3>
              <div className="space-y-2">
                {s.hasState ? (
                  <button
                    onClick={() => openCountyEditor(manageStateAbbr)}
                    className="block w-full text-left text-sm px-3 py-2 text-blue-600 hover:bg-slate-100 rounded"
                  >
                    Switch to counties only
                  </button>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        setSaving(true);
                        try {
                          await fetch(`/api/reps/${repId}/territory`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              stateAbbr: manageStateAbbr,
                              wholeState: true,
                            }),
                          });
                          setManageStateAbbr(null);
                          loadRep();
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                      className="block w-full text-left text-sm px-3 py-2 text-blue-600 hover:bg-slate-100 rounded disabled:opacity-50"
                    >
                      Switch to whole state
                    </button>
                    <button
                      onClick={() => openCountyEditor(manageStateAbbr)}
                      className="block w-full text-left text-sm px-3 py-2 text-blue-600 hover:bg-slate-100 rounded"
                    >
                      Edit counties
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleRemoveState(manageStateAbbr)}
                  disabled={saving}
                  className="block w-full text-left text-sm px-3 py-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                >
                  Remove state
                </button>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200">
                <button
                  onClick={() => setManageStateAbbr(null)}
                  className="text-sm text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
