"use client";

import { useState } from "react";
import { AlertOctagon, CheckCircle2, RefreshCw } from "lucide-react";

interface NbnOutageResponse {
  hasOutage: boolean;
  summary: string;
  affectedServices?: string[];
  startTime?: string;
  eta?: string;
  source?: string;
  checkedAt?: string;
  cached?: boolean;
  error?: string;
}

export function NbnCheckPanel({ address }: { address: string }) {
  const [data, setData] = useState<NbnOutageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check(force = false) {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/nbn-outage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, force }),
      });
      const j = (await res.json()) as NbnOutageResponse;
      if (!res.ok) {
        setError(j.error || `HTTP ${res.status}`);
        return;
      }
      setData(j);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {!data && !error ? (
        <p className="text-xs text-slate-400">
          Press check to query NBN for this address.
        </p>
      ) : null}
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      {data ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {data.hasOutage ? (
              <AlertOctagon className="h-4 w-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            )}
            <span
              className={
                "font-mono text-xs uppercase tracking-wider " +
                (data.hasOutage ? "text-rose-300" : "text-emerald-300")
              }
            >
              {data.hasOutage ? "outage" : "no outage"}
            </span>
          </div>
          <p className="text-xs text-slate-300">{data.summary}</p>
          {data.checkedAt ? (
            <p className="font-mono text-[10px] text-slate-500">
              checked {new Date(data.checkedAt).toLocaleString()}
              {data.cached ? " · cached" : ""}
            </p>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => void check(true)}
        disabled={loading || !address}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 font-mono text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-200 disabled:opacity-50"
      >
        <RefreshCw className={"h-3 w-3 " + (loading ? "animate-spin" : "")} />
        {loading ? "Checking…" : data ? "Re-check" : "Check NBN"}
      </button>
    </div>
  );
}
