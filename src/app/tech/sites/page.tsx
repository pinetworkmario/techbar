import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import type { Site, SiteHealth } from "@/lib/types";
import { TechSitesFilter } from "./TechSitesFilter";

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

function toRow(s: Site): TechSiteRow {
  return {
    id: s.id,
    name: s.name,
    state: s.state,
    address: s.address,
    health: s.health,
    openTickets: s.openTickets,
    devicesCount: s.devicesCount,
    networkVendor: s.networkModule?.vendor,
    ruijieGroup: s.ruijieGroupName,
    cctvCameraVendor: s.cctvModule?.cameraVendor,
    ateraCustomer: s.endpointModule?.ateraCustomerName,
    supportPack: s.supportPack,
    lanSubnet: s.lanSubnet,
  };
}

export default async function TechSitesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/tech/sites");
  if (!me.isAdmin && !me.isTech) redirect("/portal/sites");

  const rows: TechSiteRow[] = sites.map(toRow);

  const healthCounts = rows.reduce(
    (acc, r) => {
      acc[r.health] = (acc[r.health] ?? 0) + 1;
      return acc;
    },
    { Healthy: 0, Warning: 0, Critical: 0 } as Record<SiteHealth, number>,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-100">
            <Building2 className="h-6 w-6 text-cyan-400" /> All sites
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Pick a site to see live status, vendor portals, and run diagnostics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 font-mono font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
            {healthCounts.Healthy} healthy
          </span>
          <span className="rounded-full bg-amber-500/20 px-2.5 py-1 font-mono font-semibold text-amber-300 ring-1 ring-amber-400/30">
            {healthCounts.Warning} warning
          </span>
          <span className="rounded-full bg-rose-500/20 px-2.5 py-1 font-mono font-semibold text-rose-300 ring-1 ring-rose-400/30">
            {healthCounts.Critical} critical
          </span>
        </div>
      </div>

      <TechSitesFilter rows={rows} />
    </div>
  );
}
