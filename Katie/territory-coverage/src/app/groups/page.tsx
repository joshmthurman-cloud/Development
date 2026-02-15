"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

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
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editServicesWholeState, setEditServicesWholeState] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");
  const [newServicesWholeState, setNewServicesWholeState] = useState(true);
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

  const handleSave = async (id: string) => {
    await fetch(`/api/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        colorHex: editColor,
        servicesWholeState: editServicesWholeState,
      }),
    });
    setEditingId(null);
    loadGroups();
  };

  const handleToggleServicesWholeState = async (g: Group) => {
    await fetch(`/api/groups/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servicesWholeState: !g.servicesWholeState }),
    });
    loadGroups();
  };

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
      body: JSON.stringify({
        name: newName.trim(),
        colorHex: newColor,
        servicesWholeState: newServicesWholeState,
      }),
    });
    setNewName("");
    setNewColor("#3B82F6");
    setNewServicesWholeState(true);
    setShowAdd(false);
    loadGroups();
  };

  const handleAddRep = async (groupId: string, name: string) => {
    if (!name.trim()) return;
    await fetch("/api/reps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), groupId }),
    });
    loadGroups();
  };

  const handleDeleteRep = async (repId: string) => {
    if (!confirm("Delete this rep?")) return;
    await fetch(`/api/reps/${repId}`, { method: "DELETE" });
    loadGroups();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
        <h1 className="text-xl font-semibold text-slate-800">Territory Coverage</h1>
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
            Dashboard
          </Link>
          <Link href="/groups" className="text-sm font-medium text-slate-900">
            Groups
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <h2 className="text-lg font-medium text-slate-800 mb-4">Groups</h2>

        {showAdd ? (
          <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="px-3 py-2 border rounded-lg w-48"
                placeholder="Group name"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Color</label>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newServicesWholeState}
                  onChange={(e) => setNewServicesWholeState(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Services whole state</span>
              </label>
            </div>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="mb-4 px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300"
          >
            + Add Group
          </button>
        )}

        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div
                key={g.id}
                className="p-4 bg-white rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span
                    className="w-4 h-4 rounded shrink-0"
                    style={{ backgroundColor: g.colorHex }}
                  />
                  {editingId === g.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-1 border rounded"
                      />
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editServicesWholeState}
                          onChange={(e) => setEditServicesWholeState(e.target.checked)}
                          className="rounded"
                        />
                        <span>Services whole state</span>
                      </label>
                      <button
                        onClick={() => handleSave(g.id)}
                        className="text-sm text-blue-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-sm text-slate-500"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{g.name}</span>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer" title="When off, group coverage is shown only where reps have explicit territories (state/county), not as blanket full-state coverage.">
                        <input
                          type="checkbox"
                          checked={g.servicesWholeState}
                          onChange={() => handleToggleServicesWholeState(g)}
                          className="rounded"
                        />
                        <span className="text-slate-600">Services whole state</span>
                      </label>
                      <button
                        onClick={() => {
                          setEditingId(g.id);
                          setEditName(g.name);
                          setEditColor(g.colorHex);
                          setEditServicesWholeState(g.servicesWholeState);
                        }}
                        className="text-sm text-slate-500 hover:text-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
                {editingId === g.id && (
                  <p className="text-xs text-slate-500 mb-2 ml-7">
                    When off, group coverage is shown only where reps have explicit territories (state/county), not as blanket full-state coverage.
                  </p>
                )}
                <div className="ml-7 space-y-1">
                  {g.reps.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Link
                        href={`/reps/${r.id}/territory`}
                        className="text-blue-600 hover:underline"
                      >
                        {r.name}
                      </Link>
                      <button
                        onClick={() => handleDeleteRep(r.id)}
                        className="text-red-500 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <AddRepInput
                    groupId={g.id}
                    onAdd={handleAddRep}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AddRepInput({
  groupId,
  onAdd,
}: {
  groupId: string;
  onAdd: (groupId: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);

  if (show) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rep name"
          className="px-2 py-1 border rounded text-sm w-40"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAdd(groupId, name);
              setName("");
              setShow(false);
            }
            if (e.key === "Escape") setShow(false);
          }}
        />
        <button
          onClick={() => {
            onAdd(groupId, name);
            setName("");
            setShow(false);
          }}
          className="text-sm text-blue-600"
        >
          Add
        </button>
        <button onClick={() => setShow(false)} className="text-sm text-slate-500">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShow(true)}
      className="text-sm text-slate-500 hover:text-slate-700"
    >
      + Add rep
    </button>
  );
}
