"use client";

import { useEffect, useState } from "react";
import { Activity, RefreshCw, AlertOctagon, CheckCircle2 } from "lucide-react";

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

export function NbnOutageCard({
  address,
  autoLoad = true,
  variant = "customer",
}: {
  address: string;
  autoLoad?: boolean;
  variant?: "customer" | "tech";
}) {
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

  useEffect(() => {
    if (autoLoad) void check(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, autoLoad]);

  const isTech = variant === "tech";
  const containerCls = isTech
    ? "rounded-2xl border border-slate-200 bg-white p-4 shadow-soft"
    : "rounded-2xl border border-slate-200 bg-white p-5 shadow-soft";

  const tone = !data
    ? "bg-slate-100 text-slate-500"
    : data.hasOutage
      ? "bg-rose-100 text-rose-700"
      : "bg-emerald-100 text-emerald-700";

  return (
    <div className={containerCls}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={"grid h-9 w-9 place-items-center rounded-full " + tone}>
            {data?.hasOutage ? (
              <AlertOctagon className="h-4 w-4" />
            ) : data ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              NBN outage status
            </h3>
            <p className="text-[11px] text-slate-500">
              Live check against nbnco.com.au by address.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => check(true)}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={"h-3 w-3 " + (loading ? "animate-spin" : "")}
          />
          {loading ? "Checking…" : data?.cached ? "Re-check" : "Check"}
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      {data ? (
        <div className="mt-3 space-y-2">
          <div
            className={
              "rounded-lg px-3 py-2 text-sm " +
              (data.hasOutage
                ? "bg-rose-50 text-rose-800 ring-1 ring-rose-100"
                : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100")
            }
          >
            <div className="font-semibold">
              {data.hasOutage ? "Outage detected" : "No active outage"}
            </div>
            <div className="text-xs leading-relaxed">{data.summary}</div>
          </div>

          {data.affectedServices && data.affectedServices.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {data.affectedServices.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}

          {(data.startTime || data.eta) ? (
            <div className="flex gap-3 text-[11px] text-slate-500">
              {data.startTime ? (
                <span>
                  Started:{" "}
                  <span className="text-slate-700">
                    {new Date(data.startTime).toLocaleString()}
                  </span>
                </span>
              ) : null}
              {data.eta ? (
                <span>
                  ETA:{" "}
                  <span className="text-slate-700">
                    {new Date(data.eta).toLocaleString()}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="text-[10px] text-slate-400">
            Source: {data.source ?? "nbnco.com.au"} · Checked{" "}
            {data.checkedAt
              ? new Date(data.checkedAt).toLocaleTimeString()
              : "—"}
            {data.cached ? " · cached" : ""}
          </div>
        </div>
      ) : !error && !loading ? (
        <p className="mt-3 text-xs text-slate-400">
          Click "Check" to query NBN status for{" "}
          <span className="text-slate-600">{address}</span>.
        </p>
      ) : null}
    </div>
  );
}
