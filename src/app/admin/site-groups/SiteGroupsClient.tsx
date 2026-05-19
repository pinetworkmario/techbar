"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Check,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

interface SiteOption {
  id: string;
  name: string;
  state?: string;
}
interface SiteGroup {
  id: string;
  name: string;
  description?: string;
  siteIds: string[];
  createdAt: string;
  updatedAt: string;
}

export function SiteGroupsClient({
  initial,
  sites,
}: {
  initial: SiteGroup[];
  sites: SiteOption[];
}) {
  const router = useRouter();
  const [groups, setGroups] = useState<SiteGroup[]>(initial);
  const [editing, setEditing] = useState<SiteGroup | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const r = await fetch("/api/admin/site-groups", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setGroups(j.groups || []);
  }

  async function deleteGroup(id: string) {
    if (!confirm("Delete this group? Users granted access via it keep their per-site permissions; only the group itself is removed."))
      return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/site-groups/${id}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error || "Delete failed");
        return;
      }
      await reload();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveGroup(input: {
    id?: string;
    name: string;
    description: string;
    siteIds: string[];
  }) {
    setBusy(true);
    setError(null);
    try {
      const url = input.id
        ? `/api/admin/site-groups/${input.id}`
        : "/api/admin/site-groups";
      const r = await fetch(url, {
        method: input.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          description: input.description || undefined,
          siteIds: input.siteIds,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Save failed");
        return;
      }
      setEditing(null);
      await reload();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> New Group
        </button>
      </div>

      {error ? (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {groups.length === 0 && editing !== "new" ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No site groups yet. Create one to bundle sites together for easier
          permission assignment.
        </p>
      ) : (
        <ul className="space-y-2">
          {groups.map((g) => (
            <li
              key={g.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-brand-600" />
                    <span className="font-semibold text-slate-900">
                      {g.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {g.siteIds.length} site{g.siteIds.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {g.description ? (
                    <p className="mt-0.5 text-xs text-slate-600">
                      {g.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {g.siteIds.map((sid) => {
                      const site = sites.find((s) => s.id === sid);
                      return (
                        <span
                          key={sid}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700"
                        >
                          {site?.name ?? sid}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(g)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteGroup(g.id)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <GroupEditModal
          sites={sites}
          group={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={saveGroup}
          busy={busy}
        />
      ) : null}
    </div>
  );
}

function GroupEditModal({
  sites,
  group,
  onClose,
  onSave,
  busy,
}: {
  sites: SiteOption[];
  group: SiteGroup | null;
  onClose: () => void;
  onSave: (i: {
    id?: string;
    name: string;
    description: string;
    siteIds: string[];
  }) => void;
  busy: boolean;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [picked, setPicked] = useState<Set<string>>(
    new Set(group?.siteIds ?? []),
  );
  const [filter, setFilter] = useState("");
  const visible = sites.filter((s) =>
    filter ? s.name.toLowerCase().includes(filter.toLowerCase()) : true,
  );

  function toggle(id: string) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  }
  function selectAllVisible() {
    const next = new Set(picked);
    for (const s of visible) next.add(s.id);
    setPicked(next);
  }
  function clearVisible() {
    const next = new Set(picked);
    for (const s of visible) next.delete(s.id);
    setPicked(next);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            {group ? `Edit: ${group.name}` : "New Site Group"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-4 py-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">
              Group Name *
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "VIC stores", "Okami sites"'
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">
              Description (optional)
            </span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="border-t border-slate-100 px-4 py-2">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-700">
              Sites in this group
            </span>
            <span className="text-[11px] text-slate-500">
              ({picked.size} selected)
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter…"
                className="rounded-md border border-slate-200 px-2 py-1 text-xs"
              />
            </div>
          </div>
          <div className="mb-2 flex gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={selectAllVisible}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-slate-200"
            >
              Select all (visible)
            </button>
            <button
              type="button"
              onClick={clearVisible}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-slate-200"
            >
              Clear (visible)
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <ul className="divide-y divide-slate-100">
            {visible.map((s) => {
              const on = picked.has(s.id);
              return (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(s.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="flex-1 truncate text-slate-800">
                      {s.name}
                    </span>
                    {s.state ? (
                      <span className="text-[10px] text-slate-400">
                        {s.state}
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={() =>
              onSave({
                id: group?.id,
                name: name.trim(),
                description: description.trim(),
                siteIds: Array.from(picked),
              })
            }
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {group ? "Save Changes" : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
