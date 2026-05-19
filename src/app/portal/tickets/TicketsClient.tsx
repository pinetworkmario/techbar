"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  MessageSquare,
  PlusCircle,
  Send,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TicketStatusBadge } from "@/components/ui/StatusBadges";
import { CreateTicketModal } from "@/components/portal/CreateTicketModal";
import type { Ticket, TicketComment, TicketStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const STATUS_TABS: ("All" | TicketStatus)[] = [
  "All",
  "New",
  "In Progress",
  "Waiting for Customer",
  "Scheduled",
  "Resolved",
  "Closed",
];

interface SiteOpt {
  id: string;
  name: string;
}

export function TicketsClient({
  initialTickets,
  sites,
  isAdmin,
}: {
  initialTickets: Ticket[];
  sites: SiteOpt[];
  isAdmin: boolean;
}) {
  const params = useSearchParams();
  const wantsCreate = params.get("create") === "1";
  const presetSite = params.get("site") ?? undefined;
  const presetDevice = params.get("device") ?? undefined;

  const [tab, setTab] = useState<"All" | TicketStatus>("All");
  const [siteFilter, setSiteFilter] = useState<string>("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (wantsCreate) setCreateOpen(true);
  }, [wantsCreate]);

  function siteName(id: string) {
    return sites.find((s) => s.id === id)?.name ?? id;
  }

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (tab !== "All" && t.status !== tab) return false;
      if (siteFilter !== "All" && t.siteId !== siteFilter) return false;
      return true;
    });
  }, [tab, siteFilter, tickets]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Tickets"
        description="One queue across every site. Updates land here automatically."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusCircle className="h-4 w-4" /> Create Support Ticket
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3">
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map((s) => {
              const active = tab === s;
              const count =
                s === "All"
                  ? tickets.length
                  : tickets.filter((t) => t.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setTab(s)}
                  className={
                    "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition " +
                    (active
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100")
                  }
                >
                  <span>{s}</span>
                  <span
                    className={
                      "rounded-full px-1.5 text-[11px] " +
                      (active
                        ? "bg-brand-100 text-brand-700"
                        : "bg-slate-100 text-slate-500")
                    }
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="All">All sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              No tickets in this view.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((t) => {
                const expanded = openId === t.id;
                const commentCount = (t.comments ?? []).length;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(expanded ? null : t.id)}
                      className="grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 px-5 py-3 text-left transition hover:bg-slate-50"
                    >
                      {expanded ? (
                        <ChevronDown className="mt-1 h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="mt-1 h-4 w-4 text-slate-400" />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-slate-500">
                            {t.number}
                          </span>
                          <TicketStatusBadge status={t.status} />
                          <span className="font-semibold text-slate-900">
                            {t.deviceOrService}
                          </span>
                          <span className="text-xs text-slate-500">
                            @ {siteName(t.siteId)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-700">
                          {t.issueType}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          <Badge
                            tone={
                              t.businessImpact === "Cannot trade" ||
                              t.businessImpact === "Cannot take payments" ||
                              t.businessImpact === "Security risk"
                                ? "danger"
                                : t.businessImpact === "Partially impacted"
                                  ? "warning"
                                  : "muted"
                            }
                          >
                            {t.businessImpact}
                          </Badge>{" "}
                          · {t.assignedTeam} · {formatDate(t.createdAt)}
                        </div>
                        <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                          Latest: {t.latestUpdate}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-slate-500">
                        {commentCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                            <MessageSquare className="h-3 w-3" />
                            {commentCount}
                          </span>
                        ) : null}
                      </div>
                    </button>
                    {expanded ? (
                      <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 ml-7">
                        {t.description ? (
                          <div className="rounded-md bg-white p-3 text-xs text-slate-700 ring-1 ring-slate-200">
                            <div className="mb-1 text-[10px] font-semibold uppercase text-slate-500">
                              Description
                            </div>
                            <p className="whitespace-pre-wrap">
                              {t.description}
                            </p>
                          </div>
                        ) : null}
                        <CommentsThread
                          ticketId={t.id}
                          initial={t.comments ?? []}
                          onAppend={(c) => {
                            setTickets((prev) =>
                              prev.map((x) =>
                                x.id === t.id
                                  ? { ...x, comments: [...(x.comments ?? []), c] }
                                  : x,
                              ),
                            );
                          }}
                          adminMode={isAdmin}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <CreateTicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultSiteId={presetSite}
        defaultDevice={presetDevice}
      />
    </div>
  );
}

function CommentsThread({
  ticketId,
  initial,
  onAppend,
  adminMode,
}: {
  ticketId: string;
  initial: TicketComment[];
  onAppend: (c: TicketComment) => void;
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
      onAppend(j.comment);
      setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Conversation ({items.length})
      </div>
      {items.length === 0 ? (
        <p className="rounded-md bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
          No replies yet. Send the team a note below — it gets attached to this
          ticket and the assigned team will see it.
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
                  {c.authorRole === "admin" ? "PI Network" : "You"} ·{" "}
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
          placeholder="Reply to PI Network…"
          className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !text.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
      {error ? (
        <div className="text-[11px] text-rose-600">{error}</div>
      ) : null}
    </div>
  );
}
