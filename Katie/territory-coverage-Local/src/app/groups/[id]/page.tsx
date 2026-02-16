"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { VPTopNav } from "@/components/vp-dashboard/VPTopNav";

interface Rep {
  id: string;
  name: string;
  repColorHex: string | null;
  totalAmountOfSales: number | null;
  numberOfDealers: number | null;
  housingMarketShare: number | null;
}

interface Group {
  id: string;
  name: string;
  colorHex: string;
  reps: Rep[];
}

export default function GroupManagePage() {
  const params = useParams();
  const id = params.id as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [newRepName, setNewRepName] = useState("");
  const [showAddRep, setShowAddRep] = useState(false);

  const loadGroup = () => {
    fetch(`/api/groups/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setGroup)
      .catch(() => setGroup(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGroup();
  }, [id]);

  const handleAddRep = async () => {
    if (!newRepName.trim()) return;
    await fetch("/api/reps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRepName.trim(), groupId: id }),
    });
    setNewRepName("");
    setShowAddRep(false);
    loadGroup();
  };

  const handleDeleteRep = async (repId: string) => {
    if (!confirm("Delete this rep?")) return;
    await fetch(`/api/reps/${repId}`, { method: "DELETE" });
    loadGroup();
  };

  const handleRepColorChange = async (repId: string, repColorHex: string) => {
    const res = await fetch(`/api/reps/${repId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repColorHex }),
    });
    if (res.ok) loadGroup();
  };

  const handleRepFieldChange = async (
    repId: string,
    field: "totalAmountOfSales" | "numberOfDealers" | "housingMarketShare",
    value: number | null
  ) => {
    await fetch(`/api/reps/${repId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    loadGroup();
  };

  const handleGroupColorChange = async (colorHex: string) => {
    const res = await fetch(`/api/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colorHex }),
    });
    if (res.ok) loadGroup();
  };

  const shell = (content: React.ReactNode) => (
    <div className="vp-dashboard-bg min-h-screen py-6 px-4 md:py-8 md:px-6">
      <div
        className="mx-auto flex flex-col overflow-hidden min-h-[75vh] max-w-[900px]"
        style={{
          background: "var(--vp-panel-bg)",
          boxShadow: "0 25px 50px -12px var(--vp-shell-shadow)",
          borderRadius: "var(--vp-radius-xl)",
        }}
      >
        <VPTopNav />
        <main className="flex-1 p-6">{content}</main>
      </div>
    </div>
  );

  if (loading) {
    return shell(
      <p className="text-sm" style={{ color: "var(--vp-text-muted)" }}>Loading...</p>
    );
  }

  if (!group) {
    return shell(
      <div>
        <p className="text-sm mb-2" style={{ color: "var(--vp-text-muted)" }}>Group not found.</p>
        <Link href="/groups" className="text-sm font-medium hover:underline" style={{ color: "var(--vp-secondary-800)" }}>
          Back to Groups
        </Link>
      </div>
    );
  }

  return shell(
    <>
      <Link
        href="/groups"
        className="text-xs font-medium uppercase tracking-wide mb-1 inline-block"
        style={{ color: "var(--vp-text-muted)" }}
      >
        ← Back to Groups
      </Link>

      <div className="flex items-center gap-3 mb-6 mt-1">
        <input
          type="color"
          value={group.colorHex}
          onChange={(e) => handleGroupColorChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer shrink-0 border-0 p-0"
          title="Change group color"
        />
        <h2 className="text-xl font-semibold" style={{ color: "var(--vp-text-primary)" }}>
          {group.name}
        </h2>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium" style={{ color: "var(--vp-text-primary)" }}>
          Manage reps
        </h3>
        {!showAddRep && (
          <button
            onClick={() => setShowAddRep(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "var(--vp-secondary-800)" }}
          >
            + Add rep
          </button>
        )}
      </div>

      {showAddRep && (
        <div
          className="mb-4 p-4 rounded-lg border flex flex-wrap gap-3 items-end"
          style={{ background: "var(--vp-gray-50)", borderColor: "var(--vp-panel-border)" }}
        >
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--vp-text-muted)" }}>Rep name</label>
            <input
              type="text"
              value={newRepName}
              onChange={(e) => setNewRepName(e.target.value)}
              placeholder="Rep name"
              className="px-3 py-2 border rounded-lg w-48 text-sm"
              style={{ borderColor: "var(--vp-panel-border)", background: "var(--vp-panel-bg)" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddRep();
                if (e.key === "Escape") setShowAddRep(false);
              }}
            />
          </div>
          <button
            onClick={handleAddRep}
            className="px-4 py-2 text-white rounded-lg text-sm font-medium"
            style={{ background: "var(--vp-secondary-800)" }}
          >
            Add
          </button>
          <button
            onClick={() => setShowAddRep(false)}
            className="px-4 py-2 text-sm"
            style={{ color: "var(--vp-text-muted)" }}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="space-y-3">
        {group.reps.map((r) => (
          <div
            key={r.id}
            className="p-4 rounded-lg border"
            style={{ background: "var(--vp-panel-bg)", borderColor: "var(--vp-panel-border)" }}
          >
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <input
                type="color"
                value={r.repColorHex ?? group.colorHex}
                onChange={(e) => handleRepColorChange(r.id, e.target.value)}
                className="w-8 h-8 rounded cursor-pointer shrink-0"
                title="Rep color"
              />
              <Link
                href={`/reps/${r.id}/territory`}
                className="font-medium text-sm hover:underline"
                style={{ color: "var(--vp-secondary-800)" }}
              >
                {r.name}
              </Link>
              <button
                onClick={() => handleDeleteRep(r.id)}
                className="text-sm hover:opacity-80 ml-auto"
                style={{ color: "var(--vp-danger)" }}
              >
                Delete
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-11">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--vp-text-muted)" }}>
                  Total amount of sales
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: "var(--vp-gray-400)" }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={r.totalAmountOfSales ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      handleRepFieldChange(r.id, "totalAmountOfSales", v);
                    }}
                    className="w-full pl-5 pr-2 py-1.5 border rounded text-sm"
                    style={{ borderColor: "var(--vp-panel-border)", background: "var(--vp-panel-bg)" }}
                    placeholder="—"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--vp-text-muted)" }}>
                  Number of dealers
                </label>
                <input
                  type="number"
                  min="0"
                  defaultValue={r.numberOfDealers ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    handleRepFieldChange(r.id, "numberOfDealers", v);
                  }}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                  style={{ borderColor: "var(--vp-panel-border)", background: "var(--vp-panel-bg)" }}
                  placeholder="—"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--vp-text-muted)" }}>
                  Housing market share (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    defaultValue={r.housingMarketShare ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      handleRepFieldChange(r.id, "housingMarketShare", v);
                    }}
                    className="w-full pl-2 pr-6 py-1.5 border rounded text-sm"
                    style={{ borderColor: "var(--vp-panel-border)", background: "var(--vp-panel-bg)" }}
                    placeholder="—"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: "var(--vp-gray-400)" }}>%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {group.reps.length === 0 && !showAddRep && (
        <p className="text-sm py-8 text-center" style={{ color: "var(--vp-text-muted)" }}>
          No reps yet. Add one above.
        </p>
      )}
    </>
  );
}
