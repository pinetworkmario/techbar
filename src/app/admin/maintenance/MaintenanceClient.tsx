"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type {
  MaintenanceItem,
  MaintenancePriority,
  MaintenanceStatus,
} from "@/lib/types";

const STATUSES: MaintenanceStatus[] = [
  "Scheduled",
  "Due",
  "Overdue",
  "Completed",
];
const PRIORITIES: MaintenancePriority[] = ["Low", "Medium", "High", "Critical"];

const STATUS_TONE: Record<MaintenanceStatus, string> = {
  Scheduled: "bg-slate-100 text-slate-700 ring-slate-200",
  Due: "bg-amber-100 text-amber-800 ring-amber-200",
  Overdue: "bg-rose-100 text-rose-800 ring-rose-200",
  Completed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
};
const PRIORITY_TONE: Record<MaintenancePriority, string> = {
  Low: "text-slate-500",
  Medium: "text-slate-700",
  High: "text-amber-700 font-semibold",
  Critical: "text-rose-700 font-semibold",
};

interface SiteOpt { id: string; name: string }
interface DeviceOpt { id: string; siteId: string; name: string }

const EMPTY: Omit<MaintenanceItem, "id"> = {
  siteId: "",
  deviceId: undefined,
  deviceName: "(site-wide)",
  type: "",
  dueDate: new Date().toISOString().slice(0, 10),
  priority: "Medium",
  status: "Scheduled",
  assignedTeam: "Operations",
};

export function MaintenanceClient({
  initial,
  sites,
  devices,
}: {
  initial: MaintenanceItem[];
  sites: SiteOpt[];
  devices: DeviceOpt[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<MaintenanceItem[]>(initial);
  const [editing, setEditing] = useState<MaintenanceItem | "new" | null>(null);
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | "All">(
    "All",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const r = await fetch("/api/admin/maintenance", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setItems(j.items || []);
  }

  async function save(input: Partial<MaintenanceItem> & { id?: string }) {
    setBusy(true);
    setError(null);
    try {
      const url = input.id
        ? `/api/admin/maintenance/${input.id}`
        : "/api/admin/maintenance";
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

  async function markComplete(item: MaintenanceItem) {
    await save({ id: item.id, status: "Completed" });
  }

  async function remove(item: MaintenanceItem) {
    if (!confirm(`Delete maintenance "${item.type}"?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/maintenance/${item.id}`, { method: "DELETE" });
      await reload();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const counts: Record<string, number> = { All: items.length };
  for (const m of items) counts[m.status] = (counts[m.status] ?? 0) + 1;

  const filtered =
    statusFilter === "All"
      ? items
      : items.filter((m) => m.status === statusFilter);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...STATUSES] as const).map((s) => {
            const on = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={
                  "rounded-full px-3 py-1 text-xs font-medium transition " +
                  (on
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                }
              >
                {s} ({counts[s] ?? 0})
              </button>
            );
          })}
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Schedule Maintenance
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Nothing scheduled.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Due</th>
                <th className="px-3 py-2 text-left font-medium">Priority</th>
                <th className="px-3 py-2 text-left font-medium">Site / Device</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Team</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((m) => {
                const siteName =
                  sites.find((s) => s.id === m.siteId)?.name || m.siteId;
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 " +
                          STATUS_TONE[m.status]
                        }
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{m.dueDate}</td>
                    <td
                      className={
                        "px-3 py-2 text-xs " + PRIORITY_TONE[m.priority]
                      }
                    >
                      {m.priority}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="text-slate-900">{siteName}</div>
                      <div className="text-[10px] text-slate-500">
                        {m.deviceName}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {m.type}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {m.assignedTeam}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {m.status !== "Completed" ? (
                          <button
                            type="button"
                            onClick={() => markComplete(m)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" /> Complete
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setEditing(m)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(m)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <Modal
          initial={editing === "new" ? null : editing}
          sites={sites}
          devices={devices}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      ) : null}
    </div>
  );
}

function Modal({
  initial,
  sites,
  devices,
  busy,
  onClose,
  onSave,
}: {
  initial: MaintenanceItem | null;
  sites: SiteOpt[];
  devices: DeviceOpt[];
  busy: boolean;
  onClose: () => void;
  onSave: (i: Partial<MaintenanceItem> & { id?: string }) => void;
}) {
  const [data, setData] = useState<Omit<MaintenanceItem, "id">>(
    initial
      ? {
          siteId: initial.siteId,
          deviceId: initial.deviceId,
          deviceName: initial.deviceName,
          type: initial.type,
          dueDate: initial.dueDate.slice(0, 10),
          priority: initial.priority,
          status: initial.status,
          assignedTeam: initial.assignedTeam,
        }
      : { ...EMPTY, siteId: sites[0]?.id ?? "" },
  );
  function patch<K extends keyof typeof data>(k: K, v: (typeof data)[K]) {
    setData((p) => ({ ...p, [k]: v }));
  }
  const siteDevices = devices.filter((d) => d.siteId === data.siteId);
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
            {initial ? `Edit: ${initial.type}` : "New Maintenance"}
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
          <Field label="Site">
            <select
              value={data.siteId}
              onChange={(e) => {
                patch("siteId", e.target.value);
                patch("deviceId", undefined);
              }}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Device (optional)">
            <select
              value={data.deviceId ?? ""}
              onChange={(e) => {
                const v = e.target.value || undefined;
                patch("deviceId", v);
                if (v) {
                  const d = devices.find((x) => x.id === v);
                  if (d) patch("deviceName", d.name);
                } else {
                  patch("deviceName", "(site-wide)");
                }
              }}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">— site-wide —</option>
              {siteDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type *" wide>
            <input
              required
              value={data.type}
              onChange={(e) => patch("type", e.target.value)}
              placeholder='e.g. "Quarterly POS check"'
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Due date">
            <input
              type="date"
              value={data.dueDate}
              onChange={(e) => patch("dueDate", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Priority">
            <select
              value={data.priority}
              onChange={(e) =>
                patch("priority", e.target.value as MaintenancePriority)
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={data.status}
              onChange={(e) =>
                patch("status", e.target.value as MaintenanceStatus)
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Assigned team">
            <input
              value={data.assignedTeam}
              onChange={(e) => patch("assignedTeam", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
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
            disabled={busy || !data.type.trim() || !data.siteId}
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {initial ? "Save Changes" : "Schedule"}
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
