"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Hand, MessageSquare } from "lucide-react";

interface Handoff {
  id: string;
  siteId: string;
  siteName: string;
  userEmail: string;
  requestedAt: string;
  status: "pending" | "claimed" | "resolved";
  reason?: string;
  transcript: string;
  claimedBy?: string;
  claimedAt?: string;
  resolvedAt?: string;
}

const TABS: { key: Handoff["status"] | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "claimed", label: "Claimed" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

const STATUS_BADGE: Record<Handoff["status"], string> = {
  pending: "bg-amber-100 text-amber-800 ring-amber-200",
  claimed: "bg-sky-100 text-sky-800 ring-sky-200",
  resolved: "bg-emerald-100 text-emerald-800 ring-emerald-200",
};

export function ChatHandoffsClient({ initial }: { initial: Handoff[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Handoff["status"] | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const filtered =
    tab === "all" ? initial : initial.filter((h) => h.status === tab);

  async function patch(id: string, status: "claimed" | "resolved") {
    setBusyId(id);
    try {
      await fetch(`/api/admin/chat-handoffs/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const count =
            t.key === "all"
              ? initial.length
              : initial.filter((h) => h.status === t.key).length;
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "rounded-full px-3 py-1 text-xs font-medium transition " +
                (on
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200")
              }
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No handoffs in this view.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((h) => (
            <li
              key={h.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 " +
                    STATUS_BADGE[h.status]
                  }
                >
                  {h.status}
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {h.id}
                </span>
                <Link
                  href={`/admin/sites/${h.siteId}`}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  {h.siteName}
                </Link>
                <span className="text-xs text-slate-500">
                  · {h.userEmail}
                </span>
                <span className="ml-auto text-xs text-slate-500">
                  {new Date(h.requestedAt).toLocaleString()}
                </span>
              </div>
              {h.reason ? (
                <p className="mb-2 text-sm text-slate-700">{h.reason}</p>
              ) : null}
              {h.transcript ? (
                <details className="mt-1">
                  <summary className="inline-flex cursor-pointer items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                    <MessageSquare className="h-3.5 w-3.5" /> Last few chat
                    messages
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                    {h.transcript}
                  </pre>
                </details>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {h.status === "pending" ? (
                  <button
                    onClick={() => patch(h.id, "claimed")}
                    disabled={busyId === h.id}
                    className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                  >
                    <Hand className="h-3.5 w-3.5" /> Claim
                  </button>
                ) : null}
                {h.status !== "resolved" ? (
                  <button
                    onClick={() => patch(h.id, "resolved")}
                    disabled={busyId === h.id}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark resolved
                  </button>
                ) : null}
                {h.claimedBy ? (
                  <span className="text-[11px] text-slate-500">
                    claimed by {h.claimedBy} ·{" "}
                    {h.claimedAt
                      ? new Date(h.claimedAt).toLocaleString()
                      : ""}
                  </span>
                ) : null}
                {h.resolvedAt ? (
                  <span className="text-[11px] text-slate-500">
                    resolved {new Date(h.resolvedAt).toLocaleString()}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
