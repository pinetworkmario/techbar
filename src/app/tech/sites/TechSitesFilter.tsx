"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ExternalLink } from "lucide-react";
import type { SiteHealth } from "@/lib/types";

interface TechSiteRow {
  id: string;
  name: string;
  state: string;
  address: string;
  health: SiteHealth;
  openTickets: number;
  devicesCount: number;
  networkVendor?: string;
  ruijieGroup?: string;
  cctvCameraVendor?: string;
  ateraCustomer?: string;
  supportPack?: string;
  lanSubnet?: string;
}

const HEALTH_DOT: Record<SiteHealth, string> = {
  Healthy: "bg-emerald-400",
  Warning: "bg-amber-400",
  Critical: "bg-rose-400",
};

const HEALTH_GLOW: Record<SiteHealth, string> = {
  Healthy: "shadow-[0_0_8px_rgba(52,211,153,0.7)]",
  Warning: "shadow-[0_0_8px_rgba(251,191,36,0.7)]",
  Critical: "shadow-[0_0_8px_rgba(251,113,133,0.8)]",
};

export function TechSitesFilter({ rows }: { rows: TechSiteRow[] }) {
  const [q, setQ] = useState("");
  const [healthFilter, setHealthFilter] = useState<SiteHealth | "all">("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (healthFilter !== "all" && r.health !== healthFilter) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.state.toLowerCase().includes(needle) ||
        r.address.toLowerCase().includes(needle) ||
        (r.ruijieGroup ?? "").toLowerCase().includes(needle) ||
        (r.ateraCustomer ?? "").toLowerCase().includes(needle) ||
        (r.lanSubnet ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, healthFilter]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-900/80 p-3 ring-1 ring-slate-800 backdrop-blur">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search name, state, address, subnet, Ruijie group, Atera customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>
        <div className="flex gap-1 text-xs">
          {(["all", "Healthy", "Warning", "Critical"] as const).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHealthFilter(h)}
              className={
                "rounded-full px-3 py-1.5 font-medium transition " +
                (healthFilter === h
                  ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
                  : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200")
              }
            >
              {h === "all" ? "All" : h}
            </button>
          ))}
        </div>
        <div className="font-mono text-xs text-slate-400">
          {filtered.length} / {rows.length}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => (
          <Link
            key={r.id}
            href={`/tech/sites/${r.id}`}
            className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-slate-100 transition hover:border-cyan-500/40 hover:shadow-glow-cyan"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "h-2 w-2 shrink-0 rounded-full " +
                      HEALTH_DOT[r.health] +
                      " " +
                      HEALTH_GLOW[r.health]
                    }
                  />
                  <h3 className="truncate text-sm font-semibold text-slate-100 group-hover:text-cyan-200">
                    {r.name}
                  </h3>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  <span className="font-mono text-slate-300">{r.state}</span>
                  <span className="text-slate-600"> · </span>
                  {r.address}
                </p>
                {r.lanSubnet ? (
                  <p className="mt-1 font-mono text-[10px] text-slate-500">
                    {r.lanSubnet}.0/24
                  </p>
                ) : null}
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-cyan-400" />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider">
              {r.networkVendor ? (
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-cyan-200 ring-1 ring-cyan-400/20">
                  {r.networkVendor}
                </span>
              ) : null}
              {r.cctvCameraVendor ? (
                <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-violet-200 ring-1 ring-violet-400/20">
                  CCTV: {r.cctvCameraVendor}
                </span>
              ) : null}
              {r.ateraCustomer ? (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-200 ring-1 ring-emerald-400/20">
                  Atera
                </span>
              ) : null}
              {r.supportPack ? (
                <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-slate-300 ring-1 ring-slate-700">
                  {r.supportPack.replace(/_/g, " ")}
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400">
                {r.devicesCount} devices
              </span>
              {r.openTickets > 0 ? (
                <span className="font-mono font-semibold text-amber-300">
                  {r.openTickets} open
                </span>
              ) : (
                <span className="text-emerald-300">no open tickets</span>
              )}
            </div>
          </Link>
        ))}
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
            No sites match.
          </div>
        ) : null}
      </div>
    </>
  );
}
