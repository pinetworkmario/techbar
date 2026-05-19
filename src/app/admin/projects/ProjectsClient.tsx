"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/types";

const STATUSES: ProjectStatus[] = [
  "Planning",
  "Hardware Ordered",
  "Staging",
  "In Transit",
  "Onsite Scheduled",
  "Installed",
  "Completed",
];
const CATEGORIES: Project["category"][] = [
  "New Store Opening",
  "CCTV Upgrade",
  "POS Rollout",
  "Router Replacement",
  "Network Upgrade",
];

const STATUS_TONE: Record<ProjectStatus, string> = {
  Planning: "bg-slate-100 text-slate-700 ring-slate-200",
  "Hardware Ordered": "bg-amber-100 text-amber-800 ring-amber-200",
  Staging: "bg-sky-100 text-sky-800 ring-sky-200",
  "In Transit": "bg-violet-100 text-violet-800 ring-violet-200",
  "Onsite Scheduled": "bg-indigo-100 text-indigo-800 ring-indigo-200",
  Installed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  Completed: "bg-emerald-200 text-emerald-900 ring-emerald-300",
};

interface SiteOpt {
  id: string;
  name: string;
}

const EMPTY: Omit<Project, "id"> = {
  name: "",
  siteId: "",
  category: "New Store Opening",
  status: "Planning",
  startDate: new Date().toISOString().slice(0, 10),
  expectedCompletion: "",
  owner: "",
  progress: 0,
};

export function ProjectsClient({
  initial,
  sites,
}: {
  initial: Project[];
  sites: SiteOpt[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Project[]>(initial);
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const r = await fetch("/api/admin/projects", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setItems(j.projects || []);
  }

  async function save(input: Partial<Project> & { id?: string }) {
    setBusy(true);
    setError(null);
    try {
      const url = input.id
        ? `/api/admin/projects/${input.id}`
        : "/api/admin/projects";
      const r = await fetch(url, {
        method: input.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
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

  async function remove(p: Project) {
    if (!confirm(`Delete project "${p.name}"?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/projects/${p.id}`, { method: "DELETE" });
      await reload();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> New Project
        </button>
      </div>

      {error ? (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No projects yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => {
            const siteName =
              sites.find((s) => s.id === p.siteId)?.name || p.siteId;
            return (
              <li
                key={p.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {p.name}
                      </span>
                      <span
                        className={
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 " +
                          STATUS_TONE[p.status]
                        }
                      >
                        {p.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        {p.category} · {siteName}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Owner: {p.owner || "—"} · Start{" "}
                      {p.startDate || "—"} · Due {p.expectedCompletion || "—"}
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-brand-600"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-medium text-slate-700">
                          {p.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing ? (
        <ProjectModal
          initial={editing === "new" ? null : editing}
          sites={sites}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      ) : null}
    </div>
  );
}

function ProjectModal({
  initial,
  sites,
  busy,
  onClose,
  onSave,
}: {
  initial: Project | null;
  sites: SiteOpt[];
  busy: boolean;
  onClose: () => void;
  onSave: (i: Partial<Project> & { id?: string }) => void;
}) {
  const [data, setData] = useState<Omit<Project, "id">>(
    initial
      ? {
          name: initial.name,
          siteId: initial.siteId,
          category: initial.category,
          status: initial.status,
          startDate: initial.startDate.slice(0, 10),
          expectedCompletion: initial.expectedCompletion.slice(0, 10),
          owner: initial.owner,
          progress: initial.progress,
        }
      : { ...EMPTY, siteId: sites[0]?.id ?? "" },
  );
  function patch<K extends keyof typeof data>(k: K, v: (typeof data)[K]) {
    setData((p) => ({ ...p, [k]: v }));
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            {initial ? `Edit: ${initial.name}` : "New Project"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 px-4 py-3 sm:grid-cols-2">
          <Field label="Project name *" wide>
            <input
              required
              value={data.name}
              onChange={(e) => patch("name", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Site">
            <select
              value={data.siteId}
              onChange={(e) => patch("siteId", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              value={data.category}
              onChange={(e) =>
                patch("category", e.target.value as Project["category"])
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={data.status}
              onChange={(e) => patch("status", e.target.value as ProjectStatus)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Owner">
            <input
              value={data.owner}
              onChange={(e) => patch("owner", e.target.value)}
              placeholder="Team or person"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Start date">
            <input
              type="date"
              value={data.startDate}
              onChange={(e) => patch("startDate", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Expected completion">
            <input
              type="date"
              value={data.expectedCompletion}
              onChange={(e) => patch("expectedCompletion", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label={`Progress: ${data.progress}%`} wide>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={data.progress}
              onChange={(e) => patch("progress", Number(e.target.value))}
              className="w-full"
            />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                ...(initial ? { id: initial.id } : {}),
                ...data,
              })
            }
            disabled={busy || !data.name.trim() || !data.siteId}
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {initial ? "Save Changes" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={"block " + (wide ? "sm:col-span-2" : "")}>
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
