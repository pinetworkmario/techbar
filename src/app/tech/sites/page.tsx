import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Search } from "lucide-react";
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
  };
}

export default async function TechSitesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/tech/sites");
  if (!me.isAdmin && !me.isTech) redirect("/portal/sites");

  const rows: TechSiteRow[] = sites.map(toRow);

  // Stats
  const healthCounts = rows.reduce(
    (acc, r) => {
      acc[r.health] = (acc[r.health] ?? 0) + 1;
      return acc;
    },
    { Healthy: 0, Warning: 0, Critical: 0 } as Record<SiteHealth, number>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Building2 className="h-6 w-6 text-sky-500" /> All sites
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Pick a site to see live status, vendor portals, and run diagnostics.
          </p>
        </div>
        <div className="hidden gap-2 text-xs sm:flex">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
            {healthCounts.Healthy} healthy
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
            {healthCounts.Warning} warning
          </span>
          <span className="rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700">
            {healthCounts.Critical} critical
          </span>
        </div>
      </div>

      <TechSitesFilter rows={rows} />
    </div>
  );
}
