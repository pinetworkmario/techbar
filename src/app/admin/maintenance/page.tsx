import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser, isInternal } from "@/lib/auth";
import { devices, maintenanceItems, sites } from "@/lib/data";
import { MaintenanceClient } from "./MaintenanceClient";

export default async function MaintenancePage() {
  const me = await getCurrentUser();
  if (!me || !isInternal(me)) redirect("/login?next=/admin/maintenance");
  const sorted = maintenanceItems
    .slice()
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  return (
    <div className="space-y-4">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Admin home
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Maintenance</h1>
        <p className="text-sm text-slate-500">
          Schedule recurring + ad-hoc maintenance tasks. Visible to customers
          on their site detail and lifecycle pages.
        </p>
      </div>
      <MaintenanceClient
        initial={sorted}
        sites={sites.map((s) => ({ id: s.id, name: s.name }))}
        devices={devices.map((d) => ({
          id: d.id,
          siteId: d.siteId,
          name: d.name,
        }))}
      />
    </div>
  );
}
