"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { VPTopNav } from "@/components/vp-dashboard/VPTopNav";

interface Group {
  id: string;
  name: string;
  colorHex: string;
  servicesWholeState: boolean;
  workGroupAccount: string | null;
  reps: { id: string }[];
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const loadGroups = () => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this group and all its reps?")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    loadGroups();
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    setShowAdd(false);
    loadGroups();
  };

  return (
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

        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Link
                href="/"
                className="text-xs font-medium uppercase tracking-wide mb-1 inline-block"
                style={{ color: "var(--vp-text-muted)" }}
              >
                ← Dashboard
              </Link>
              <h2 className="text-lg font-semibold" style={{ color: "var(--vp-text-primary)" }}>
                Groups
              </h2>
            </div>
            {!showAdd && (
              <button
                onClick={() => setShowAdd(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: "var(--vp-secondary-800)" }}
              >
                + Add Group
              </button>
            )}
          </div>

          {showAdd && (
            <div
              className="mb-5 p-4 rounded-lg border flex flex-wrap gap-3 items-end"
              style={{ background: "var(--vp-gray-50)", borderColor: "var(--vp-panel-border)" }}
            >
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--vp-text-muted)" }}>Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="px-3 py-2 border rounded-lg w-48 text-sm"
                  style={{ borderColor: "var(--vp-panel-border)", background: "var(--vp-panel-bg)" }}
                  placeholder="Group name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                    if (e.key === "Escape") setShowAdd(false);
                  }}
                />
              </div>
              <button
                onClick={handleAdd}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium"
                style={{ background: "var(--vp-secondary-800)" }}
              >
                Add
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-sm"
                style={{ color: "var(--vp-text-muted)" }}
              >
                Cancel
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-sm" style={{ color: "var(--vp-text-muted)" }}>Loading...</p>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="p-4 rounded-lg border flex items-center gap-3 flex-wrap transition-colors hover:border-[var(--vp-gray-400)]"
                  style={{ background: "var(--vp-panel-bg)", borderColor: "var(--vp-panel-border)" }}
                >
                  <span
                    className="w-4 h-4 rounded shrink-0"
                    style={{ backgroundColor: g.colorHex }}
                  />
                  <Link
                    href={`/groups/${g.id}`}
                    className="font-medium text-sm hover:underline"
                    style={{ color: "var(--vp-secondary-800)" }}
                  >
                    {g.name}
                  </Link>
                  <span className="text-sm" style={{ color: "var(--vp-text-muted)" }}>
                    {g.reps.length} rep{g.reps.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="text-sm hover:opacity-80 ml-auto"
                    style={{ color: "var(--vp-danger)" }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {groups.length === 0 && (
                <p className="text-sm py-8 text-center" style={{ color: "var(--vp-text-muted)" }}>
                  No groups yet. Add one above.
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
