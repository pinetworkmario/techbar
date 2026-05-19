"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { ActivityEntry } from "@/lib/types";

const KIND_TONE: Record<string, string> = {
  ticket: "bg-sky-100 text-sky-800 ring-sky-200",
  project: "bg-violet-100 text-violet-800 ring-violet-200",
  maintenance: "bg-amber-100 text-amber-800 ring-amber-200",
  device: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  service: "bg-slate-100 text-slate-700 ring-slate-200",
};

const KINDS = ["ticket", "project", "maintenance", "device", "service"];

export function ActivityClient({ initial }: { initial: ActivityEntry[] }) {
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: initial.length };
    for (const e of initial) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [initial]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return initial.filter((e) => {
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      if (!term) return true;
      return (
        e.text.toLowerCase().includes(term) ||
        e.kind.toLowerCase().includes(term)
      );
    });
  }, [initial, q, kindFilter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search by text or ticket/project ID (e.g. "PI-1042")'
            className="w-full rounded-md border border-slate-200 py-2 pl-8 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:text-slate-700"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...KINDS] as const).map((k) => {
            const on = kindFilter === k;
            return (
              <button
                key={k}
                onClick={() => setKindFilter(k)}
                className={
                  "rounded-full px-3 py-1 text-xs font-medium transition " +
                  (on
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                }
              >
                {k} ({counts[k] ?? 0})
              </button>
            );
          })}
        </div>
        <span className="ml-auto text-[11px] text-slate-500">
          {filtered.length} of {initial.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          {q
            ? `No activity matching "${q}".`
            : "No activity yet. Make any change and it'll show up here."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {filtered.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-3 px-4 py-2.5 text-sm"
            >
              <span
                className={
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 " +
                  (KIND_TONE[e.kind] || KIND_TONE.service)
                }
              >
                {e.kind}
              </span>
              <span className="flex-1 text-slate-800">
                {q ? <Highlight text={e.text} term={q} /> : e.text}
              </span>
              <span className="shrink-0 text-[11px] text-slate-500">
                {new Date(e.at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Highlight the search term inside text. Case-insensitive, single-pass. */
function Highlight({ text, term }: { text: string; term: string }) {
  const t = term.trim();
  if (!t) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(t.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200 text-slate-900">
        {text.slice(idx, idx + t.length)}
      </mark>
      {text.slice(idx + t.length)}
    </>
  );
}
