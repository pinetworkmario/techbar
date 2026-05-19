"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Loader2,
  MapPin,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SiteHealthBadge } from "@/components/ui/StatusBadges";

const SERVICE_LABEL: Record<string, string> = {
  network: "Network",
  fourg_backup: "4G Backup",
  voice: "Voice",
  pos: "POS & Payments",
  cctv: "CCTV & Alarm",
  endpoint: "Endpoint",
  it_support: "IT Support",
  microsoft: "Microsoft",
  projects: "Projects",
};

export interface SiteCardData {
  id: string;
  name: string;
  state: string;
  address: string;
  health: "Healthy" | "Warning" | "Critical";
  servicesCovered: string[];
  devicesCount: number;
  openTickets: number;
  maintenanceDue: number;
  mainContactName: string;
  mainContactRole: string;
  online: number;
  total: number;
  ruijieLinked: boolean;
  supportPackKey: string;
  supportPackLabel: string;
  supportPackTone: "brand" | "success" | "warning" | "neutral";
}

type RefreshState = "idle" | "loading" | "stale" | "stopped";

export function SitesListClient({ sites }: { sites: SiteCardData[] }) {
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(
      sites.map((s) => [
        s.id,
        {
          online: s.online,
          total: s.total,
          state: s.ruijieLinked ? ("loading" as RefreshState) : ("idle" as RefreshState),
        },
      ]),
    ),
  );

  useEffect(() => {
    let cancelled = false;
    let stoppedSession = false;

    async function refreshOne(siteId: string) {
      if (cancelled || stoppedSession) return;
      setStatuses((prev) => ({
        ...prev,
        [siteId]: { ...prev[siteId], state: "loading" },
      }));
      try {
        const r = await fetch(`/api/account/sites/${siteId}/refresh-status`, {
          method: "POST",
        });
        if (r.status === 401 || r.status === 403) {
          stoppedSession = true;
          return;
        }
        if (!r.ok) {
          if (cancelled) return;
          setStatuses((prev) => ({
            ...prev,
            [siteId]: { ...prev[siteId], state: "stale" },
          }));
          return;
        }
        const j = await r.json();
        const devs: { status: string }[] = j.devices || [];
        const online = devs.filter((d) => d.status === "Active").length;
        const total = devs.length;
        if (cancelled) return;
        setStatuses((prev) => ({
          ...prev,
          [siteId]: { online, total, state: "idle" },
        }));
      } catch {
        if (cancelled) return;
        setStatuses((prev) => ({
          ...prev,
          [siteId]: { ...prev[siteId], state: "stale" },
        }));
      }
    }

    async function fanOut() {
      if (cancelled || stoppedSession) return;
      const linked = sites.filter((s) => s.ruijieLinked).map((s) => s.id);
      // Concurrency limit 3
      const queue = [...linked];
      async function worker() {
        while (queue.length && !cancelled && !stoppedSession) {
          const id = queue.shift();
          if (!id) break;
          await refreshOne(id);
        }
      }
      await Promise.all([worker(), worker(), worker()]);
    }

    fanOut();
    const timer = setInterval(fanOut, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [sites]);

  if (sites.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        You don't currently have access to any sites. Ask your PI Network
        account manager to grant access.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sites.map((site) => {
        const st = statuses[site.id];
        return (
          <Link
            key={site.id}
            href={`/portal/sites/${site.id}`}
            className="group block focus:outline-none"
          >
            <Card className="flex h-full flex-col transition group-hover:border-brand-200 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-brand-300">
              <div className="flex items-start justify-between gap-3 p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-slate-900 group-hover:text-brand-700">
                      {site.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {site.address}
                    </div>
                  </div>
                </div>
                <SiteHealthBadge health={site.health} />
              </div>

              <div className="grid grid-cols-3 gap-3 border-y border-slate-100 bg-slate-50/50 px-5 py-3 text-xs">
                <Stat label="Devices" value={site.devicesCount} />
                <Stat label="Open tickets" value={site.openTickets} />
                <Stat label="Maintenance due" value={site.maintenanceDue} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-2">
                <LiveStatusPill
                  online={st?.online ?? 0}
                  total={st?.total ?? 0}
                  state={st?.state ?? "idle"}
                  ruijieLinked={site.ruijieLinked}
                />
                <SupportPackChip
                  label={site.supportPackLabel}
                  tone={site.supportPackTone}
                />
              </div>

              <div className="px-5 pt-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                Services
              </div>
              <div className="flex flex-wrap gap-1.5 px-5 pb-2 pt-2">
                {site.servicesCovered.map((s) => (
                  <Badge key={s} tone="neutral" className="bg-slate-50">
                    {SERVICE_LABEL[s] ?? s}
                  </Badge>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
                <div className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    {site.mainContactName}
                  </span>{" "}
                  · {site.mainContactRole}
                </div>
                <div className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 group-hover:text-brand-700">
                  Open site <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function LiveStatusPill({
  online,
  total,
  state,
  ruijieLinked,
}: {
  online: number;
  total: number;
  state: RefreshState;
  ruijieLinked: boolean;
}) {
  if (!ruijieLinked) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        Not linked to Ruijie
      </div>
    );
  }
  if (state === "loading") {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking devices…
      </div>
    );
  }
  if (state === "stale") {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-amber-600">
        <CircleAlert className="h-3 w-3" />
        Status unavailable (last attempt failed)
      </div>
    );
  }
  if (total === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        No devices recorded
      </div>
    );
  }
  const allOnline = online === total;
  const allOffline = online === 0;
  if (allOnline) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {total}/{total} devices online
      </div>
    );
  }
  if (allOffline) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600">
        <CircleAlert className="h-3.5 w-3.5" />
        All {total} devices offline
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
      <CircleAlert className="h-3.5 w-3.5" />
      {online}/{total} devices online · {total - online} offline
    </div>
  );
}

function SupportPackChip({
  label,
  tone,
}: {
  label: string;
  tone: "brand" | "success" | "warning" | "neutral";
}) {
  const cls: Record<typeof tone, string> = {
    brand: "bg-brand-50 text-brand-700 ring-brand-200",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset " +
        cls[tone]
      }
    >
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}
