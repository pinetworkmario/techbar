import Link from "next/link";
import { Building2, ChevronRight, MapPin } from "lucide-react";
import { sites, getDevicesForSite } from "@/lib/data";
import { NewSiteButton } from "./NewSiteButton";

export default function AdminSitesIndex() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Sites & Devices
          </h1>
          <p className="text-sm text-slate-500">
            Click a site to edit profile, manage devices, asset numbers and
            location photos.
          </p>
        </div>
        <NewSiteButton />
      </div>

      {sites.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No sites yet. Click <span className="font-medium">New site</span> to
          add the first one.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((s) => {
            const count = getDevicesForSite(s.id).length;
            return (
              <Link
                key={s.id}
                href={`/admin/sites/${s.id}`}
                className="group flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {s.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> {s.address}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {count} {count === 1 ? "device" : "devices"} · {s.state}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
