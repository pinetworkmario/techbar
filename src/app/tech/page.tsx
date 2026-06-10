import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  LifeBuoy,
  MessageCircle,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { sites, tickets } from "@/lib/data";
import { listHandoffs } from "@/lib/chat-handoffs";
import type { SiteHealth, TicketStatus } from "@/lib/types";
import { HandoffClaimButton } from "./HandoffClaimButton";

const HEALTH_RANK: Record<SiteHealth, number> = {
  Critical: 0,
  Warning: 1,
  Healthy: 2,
};

const HEALTH_DOT: Record<SiteHealth, string> = {
  Healthy: "bg-emerald-400",
  Warning: "bg-amber-400",
  Critical: "bg-rose-400",
};

const HEALTH_TEXT: Record<SiteHealth, string> = {
  Healthy: "text-emerald-300",
  Warning: "text-amber-300",
  Critical: "text-rose-300",
};

const STATUS_PILL: Record<TicketStatus, string> = {
  New: "bg-cyan-500/20 text-cyan-200 ring-cyan-400/30",
  "In Progress": "bg-amber-500/20 text-amber-200 ring-amber-400/30",
  "Waiting for Customer": "bg-slate-700/60 text-slate-300 ring-slate-600/50",
  Scheduled: "bg-violet-500/20 text-violet-200 ring-violet-400/30",
  Resolved: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30",
  Closed: "bg-slate-700/60 text-slate-400 ring-slate-600/50",
};

function timeAgo(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
  glow,
}: {
  label: string;
  value: number;
  tone: "neutral" | "ok" | "warn" | "alert" | "info";
  icon: typeof Activity;
  glow?: boolean;
}) {
  const toneCls = {
    neutral: "text-slate-100",
    ok: "text-emerald-300",
    warn: "text-amber-300",
    alert: "text-rose-300",
    info: "text-cyan-300",
  }[tone];
  const ringCls = {
    neutral: "ring-slate-800",
    ok: "ring-emerald-500/30",
    warn: "ring-amber-500/30",
    alert: "ring-rose-500/40",
    info: "ring-cyan-500/30",
  }[tone];
  const glowCls = glow
    ? {
        neutral: "",
        ok: "shadow-glow-emerald",
        warn: "",
        alert: "shadow-glow-rose",
        info: "shadow-glow-cyan",
      }[tone]
    : "";
  return (
    <div
      className={
        "rounded-2xl border border-slate-800 bg-slate-900/60 p-4 ring-1 " +
        ringCls +
        " " +
        glowCls
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {label}
        </span>
        <Icon className={"h-4 w-4 " + toneCls} />
      </div>
      <div className={"mt-2 font-mono text-3xl font-semibold " + toneCls}>
        {value}
      </div>
    </div>
  );
}

export default async function TechDashboardPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/tech");
  if (!me.isAdmin && !me.isTech) redirect("/portal/sites");

  const total = sites.length;
  const healthy = sites.filter((s) => s.health === "Healthy").length;
  const withIssues = sites.filter((s) => s.health !== "Healthy").length;
  const handoffs = listHandoffs();
  const pendingHandoffs = handoffs.filter((h) => h.status === "pending");

  const needsAttention = sites
    .filter((s) => s.health !== "Healthy")
    .slice()
    .sort((a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health]);

  const recentTickets = tickets
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-100">
          <Activity className="h-6 w-6 text-cyan-400" /> Ops dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Live situational awareness across every site, ticket, and human-handoff.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total sites"
          value={total}
          tone="neutral"
          icon={Building2}
        />
        <StatCard
          label="Healthy"
          value={healthy}
          tone="ok"
          icon={CheckCircle2}
          glow
        />
        <StatCard
          label="With issues"
          value={withIssues}
          tone={withIssues > 0 ? "alert" : "neutral"}
          icon={AlertTriangle}
          glow={withIssues > 0}
        />
        <StatCard
          label="Pending handoffs"
          value={pendingHandoffs.length}
          tone={pendingHandoffs.length > 0 ? "info" : "neutral"}
          icon={MessageCircle}
          glow={pendingHandoffs.length > 0}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {/* LEFT — sites needing attention */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              Sites needing attention
            </h2>
            <span className="font-mono text-[11px] text-slate-400">
              {needsAttention.length}
            </span>
          </div>
          {needsAttention.length === 0 ? (
            <p className="mt-4 text-xs text-emerald-300">All sites green.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {needsAttention.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/tech/sites/${s.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-2 transition hover:border-slate-700 hover:bg-slate-800/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            "h-2 w-2 shrink-0 rounded-full " +
                            HEALTH_DOT[s.health]
                          }
                        />
                        <span className="truncate text-sm font-medium text-slate-100">
                          {s.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-mono">{s.state}</span>
                        {s.lanSubnet ? (
                          <span className="font-mono text-slate-500">
                            {s.lanSubnet}.0/24
                          </span>
                        ) : null}
                        {s.updatedAt ? (
                          <span className="text-slate-500">
                            seen {timeAgo(s.updatedAt)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className={
                        "shrink-0 font-mono text-[10px] font-semibold uppercase " +
                        HEALTH_TEXT[s.health]
                      }
                    >
                      {s.health}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* MIDDLE — recent tickets */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <LifeBuoy className="h-4 w-4 text-amber-300" />
              Open tickets (recent)
            </h2>
            <Link
              href="/tech/tickets"
              className="font-mono text-[11px] text-cyan-300 hover:text-cyan-200"
            >
              all →
            </Link>
          </div>
          {recentTickets.length === 0 ? (
            <p className="mt-4 text-xs text-slate-400">No tickets.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {recentTickets.map((t) => {
                const site = sites.find((s) => s.id === t.siteId);
                return (
                  <li key={t.id}>
                    <Link
                      href={site ? `/tech/sites/${site.id}` : "/tech/tickets"}
                      className="flex flex-col gap-1 rounded-lg border border-transparent px-2 py-2 transition hover:border-slate-700 hover:bg-slate-800/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold text-slate-100">
                          {t.number}
                        </span>
                        <span
                          className={
                            "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ring-1 " +
                            STATUS_PILL[t.status]
                          }
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className="truncate text-xs text-slate-300">
                        {t.issueType}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="truncate">{site?.name ?? t.siteId}</span>
                        <span className="text-slate-600">·</span>
                        <span>{timeAgo(t.createdAt)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* RIGHT — pending handoffs */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <MessageCircle className="h-4 w-4 text-cyan-300" />
              Pending handoffs
            </h2>
            <Link
              href="/tech/handoffs"
              className="font-mono text-[11px] text-cyan-300 hover:text-cyan-200"
            >
              all →
            </Link>
          </div>
          {pendingHandoffs.length === 0 ? (
            <p className="mt-4 text-xs text-emerald-300">No customers waiting.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {pendingHandoffs.map((h) => (
                <li
                  key={h.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/40 px-2 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-100">
                        {h.siteName}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {h.reason ?? "Requested a human"}
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-slate-500">
                        {timeAgo(h.requestedAt)} · {h.userEmail}
                      </div>
                    </div>
                    <HandoffClaimButton id={h.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
