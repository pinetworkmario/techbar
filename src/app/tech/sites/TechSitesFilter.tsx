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
}

const HEALTH_TONE: Record<SiteHealth, string> = {
  Healthy: "bg-emerald-500",
  Warning: "bg-amber-500",
  Critical: "bg-rose-500",
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
        (r.ateraCustomer ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, healthFilter]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, state, address, Ruijie group, Atera customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>
        <div className="flex gap-1 text-xs">
          {(["all", "Healthy", "Warning", "Critical"] as const).map((h) => (
            <button
              key={h}
              onClick={() => setHealthFilter(h)}
              className={
                "rounded-full px-3 py-1.5 font-medium transition " +
                (healthFilter === h
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200")
              }
            >
              {h === "all" ? "All" : h}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500">
          {filtered.length} / {rows.length}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => (
          <Link
            key={r.id}
            href={`/tech/sites/${r.id}`}
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-soft transition hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "h-2 w-2 shrink-0 rounded-full " + HEALTH_TONE[r.health]
                    }
                  />
                  <h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-sky-700">
                    {r.name}
                  </h3>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {r.state} · {r.address}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-sky-500" />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider">
              {r.networkVendor ? (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
                  {r.networkVendor}
                </span>
              ) : null}
              {r.cctvCameraVendor ? (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">
                  CCTV: {r.cctvCameraVendor}
                </span>
              ) : null}
              {r.ateraCustomer ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                  Atera
                </span>
              ) : null}
              {r.supportPack ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                  {r.supportPack.replace(/_/g, " ")}
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{r.devicesCount} devices</span>
              {r.openTickets > 0 ? (
                <span className="font-medium text-amber-700">
                  {r.openTickets} open ticket{r.openTickets > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-emerald-600">no open tickets</span>
              )}
            </div>
          </Link>
        ))}
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No sites match.
          </div>
        ) : null}
      </div>
    </>
  );
}
