"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import type { Ticket, TicketStatus } from "@/lib/types";

const STATUSES: TicketStatus[] = [
  "New",
  "In Progress",
  "Waiting for Customer",
  "Scheduled",
  "Resolved",
  "Closed",
];

const STATUS_TONE: Record<TicketStatus, string> = {
  New: "bg-sky-100 text-sky-800 ring-sky-200",
  "In Progress": "bg-amber-100 text-amber-800 ring-amber-200",
  "Waiting for Customer": "bg-violet-100 text-violet-800 ring-violet-200",
  Scheduled: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  Resolved: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  Closed: "bg-slate-100 text-slate-600 ring-slate-200",
};

const IMPACT_TONE: Record<string, string> = {
  "No major impact": "text-slate-500",
  "Partially impacted": "text-amber-600",
  "Cannot take payments": "text-rose-600 font-semibold",
  "Cannot trade": "text-rose-700 font-semibold",
  "Security risk": "text-rose-700 font-semibold",
};

interface SiteOpt {
  id: string;
  name: string;
}

export function TicketsClient({
  initial,
  sites,
}: {
  initial: Ticket[];
  sites: SiteOpt[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Ticket[]>(initial);
  const [filter, setFilter] = useState("");
  const [statusTab, setStatusTab] = useState<TicketStatus | "Open" | "All">(
    "Open",
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const r = await fetch("/api/admin/tickets", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setItems(j.tickets || []);
  }

  async function save(id: string, patch: Partial<Ticket>) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/tickets/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) return;
      await reload();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this ticket? Cannot be undone.")) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/tickets/${id}`, { method: "DELETE" });
      await reload();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { Open: 0, All: items.length };
    for (const t of items) {
      c[t.status] = (c[t.status] ?? 0) + 1;
      if (t.status !== "Resolved" && t.status !== "Closed")
        c.Open = (c.Open ?? 0) + 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return items.filter((t) => {
      if (statusTab === "Open" && (t.status === "Resolved" || t.status === "Closed"))
        return false;
      if (statusTab !== "Open" && statusTab !== "All" && t.status !== statusTab)
        return false;
      if (!q) return true;
      const siteName = sites.find((s) => s.id === t.siteId)?.name || "";
      return (
        t.number.toLowerCase().includes(q) ||
        t.deviceOrService.toLowerCase().includes(q) ||
        t.issueType.toLowerCase().includes(q) ||
        siteName.toLowerCase().includes(q)
      );
    });
  }, [items, filter, statusTab, sites]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by number / device / issue / site…"
            className="w-full rounded-md border border-slate-200 py-1.5 pl-7 pr-3 text-sm"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["Open", "All", ...STATUSES] as const).map((s) => {
          const on = statusTab === s;
          const n = counts[s] ?? 0;
          return (
            <button
              key={s}
              onClick={() => setStatusTab(s)}
              className={
                "rounded-full px-3 py-1 text-xs font-medium transition " +
                (on
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200")
              }
            >
              {s} ({n})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No tickets match.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => {
            const expanded = openId === t.id;
            const siteName =
              sites.find((s) => s.id === t.siteId)?.name || t.siteId;
            return (
              <li
                key={t.id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(expanded ? null : t.id)}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">
                        {t.number}
                      </span>
                      <span
                        className={
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 " +
                          STATUS_TONE[t.status]
                        }
                      >
                        {t.status}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {t.deviceOrService}
                      </span>
                      <span className="text-xs text-slate-500">
                        @ {siteName}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-700">
                      {t.issueType}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={
                          (IMPACT_TONE[t.businessImpact] || "text-slate-500") +
                          " inline-flex items-center gap-1"
                        }
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {t.businessImpact}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Clock className="h-3 w-3" />
                        {new Date(t.createdAt).toLocaleString()}
                      </span>
                      <span className="text-slate-500">
                        Assigned: {t.assignedTeam}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11px] text-slate-600">
                      Latest: {t.latestUpdate}
                    </p>
                  </div>
                </button>
                {expanded ? (
                  <TicketEditor
                    ticket={t}
                    busy={busy}
                    onSave={save}
                    onDelete={remove}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TicketEditor({
  ticket,
  busy,
  onSave,
  onDelete,
}: {
  ticket: Ticket;
  busy: boolean;
  onSave: (id: string, patch: Partial<Ticket>) => void;
  onDelete: (id: string) => void;
}) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [assignedTeam, setAssignedTeam] = useState(ticket.assignedTeam);
  const [latestUpdate, setLatestUpdate] = useState(ticket.latestUpdate);
  const dirty =
    status !== ticket.status ||
    assignedTeam !== ticket.assignedTeam ||
    latestUpdate !== ticket.latestUpdate;
  return (
    <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-4">
      {ticket.description ? (
        <div className="rounded-md bg-white p-3 text-xs text-slate-700 ring-1 ring-slate-200">
          <div className="mb-1 text-[10px] font-semibold uppercase text-slate-500">
            Customer description
          </div>
          <p className="whitespace-pre-wrap">{ticket.description}</p>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-600">
            Status
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TicketStatus)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-600">
            Assigned team / technician
          </span>
          <input
            value={assignedTeam}
            onChange={(e) => setAssignedTeam(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-medium text-slate-600">
            Latest update (shown to customer verbatim)
          </span>
          <textarea
            rows={3}
            value={latestUpdate}
            onChange={(e) => setLatestUpdate(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onDelete(ticket.id)}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete ticket
        </button>
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={() =>
            onSave(ticket.id, { status, assignedTeam, latestUpdate })
          }
          className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? <Save className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>

      <CommentsThread ticketId={ticket.id} initial={ticket.comments ?? []} adminMode />
    </div>
  );
}

function CommentsThread({
  ticketId,
  initial,
  adminMode,
}: {
  ticketId: string;
  initial: import("@/lib/types").TicketComment[];
  adminMode: boolean;
}) {
  const [items, setItems] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    setError(null);
    try {
      const url = adminMode
        ? `/api/admin/tickets/${ticketId}/comments`
        : `/api/account/tickets/${ticketId}/comments`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Failed");
        return;
      }
      setItems((prev) => [...prev, j.comment]);
      setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-slate-200 pt-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Conversation ({items.length})
      </div>
      {items.length === 0 ? (
        <p className="rounded-md bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
          No comments yet. Replies here are shared with the customer.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li
              key={c.id}
              className={
                "rounded-md px-3 py-2 text-xs ring-1 " +
                (c.authorRole === "admin"
                  ? "bg-brand-50 ring-brand-100"
                  : "bg-white ring-slate-200")
              }
            >
              <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-slate-500">
                <span>
                  {c.authorRole === "admin" ? "PI Network" : "Customer"} ·{" "}
                  {c.authorName}
                </span>
                <span>{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-slate-800">{c.text}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-start gap-2">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Reply to the customer…"
          className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !text.trim()}
          className="rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {busy ? "Sending…" : "Reply"}
        </button>
      </div>
      {error ? (
        <div className="text-[11px] text-rose-600">{error}</div>
      ) : null}
    </div>
  );
}
