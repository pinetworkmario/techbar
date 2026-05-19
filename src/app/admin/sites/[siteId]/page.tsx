import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Tablet } from "lucide-react";
import {
  assetNumber,
  devicePhotoUrl,
  getDevicesForSite,
  getSiteById,
} from "@/lib/data";
import { getDeviceOverrides } from "@/lib/store";
import { AdminSiteEditor, type AdminDeviceRow } from "./AdminSiteEditor";
import { SiteProfileEditor } from "./SiteProfileEditor";

export default async function AdminSitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const site = getSiteById(siteId);
  if (!site) notFound();
  const overrides = await getDeviceOverrides();

  const devices: AdminDeviceRow[] = getDevicesForSite(siteId).map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    location: d.location,
    brand: d.brand,
    model: d.model,
    serialNumber: d.serialNumber,
    status: d.status,
    lifecycleStage: d.lifecycleStage,
    warrantyExpiry: d.warrantyExpiry,
    serviceCoverage: d.serviceCoverage as string[],
    assetNumber: assetNumber(d),
    photoUrl: devicePhotoUrl(d),
    hasUploadedPhoto: !!d.photoUrl,
    notes: overrides[d.id]?.notes ?? "",
    gallery: overrides[d.id]?.gallery ?? [],
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/admin/sites"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> All sites
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{site.name}</h1>
          <p className="text-sm text-slate-500">{site.address}</p>
        </div>
        <Link
          href={`/onsite/site/${site.id}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-br from-slate-900 to-slate-800 px-3 py-2 text-sm font-medium text-white shadow ring-1 ring-sky-500/40 hover:from-slate-800 hover:to-slate-700 hover:shadow-[0_0_16px_rgba(56,189,248,0.3)]"
          title="Open the iPad-friendly onsite mode for this site"
        >
          <Tablet className="h-4 w-4 text-sky-400" />
          Onsite Mode
        </Link>
      </div>

      <SiteProfileEditor
        initial={{
          id: site.id,
          name: site.name,
          state: site.state,
          address: site.address,
          health: site.health,
          servicesCovered: site.servicesCovered as string[],
          notes: site.notes ?? "",
          contactName: site.mainContact.name,
          contactRole: site.mainContact.role,
          contactPhone: site.mainContact.phone,
          contactEmail: site.mainContact.email,
          ruijieGroupName: site.ruijieGroupName ?? "",
          supportPack: site.supportPack ?? "no_support",
          lanSubnet: site.lanSubnet ?? "",
          dhcpScope: site.dhcpScope,
          accessType: site.accessNetwork?.type ?? "Other",
          accessCarrier: site.accessNetwork?.carrier ?? "",
          accessPlanSpeed: site.accessNetwork?.planSpeed ?? "",
          accessHasFailover: site.accessNetwork?.hasFailover ?? false,
          accessFailoverType: site.accessNetwork?.failoverType ?? "",
          carbonServiceId: site.carbonServiceId,
          carbonPoiName: site.carbonPoiName,
          carbonServiceAlias: site.carbonServiceAlias,
          networkVendor: site.networkModule?.vendor ?? "",
          networkSiteIdentifier:
            site.networkModule?.siteIdentifier ?? site.ruijieGroupName ?? "",
          voiceMode: site.voiceModule?.mode ?? "",
          voiceCustomDomain: site.voiceModule?.customDomain ?? "",
          voiceExtensions: (site.voiceModule?.extensions ?? []).join(", "),
          cctvCameraVendor: site.cctvModule?.cameraVendor ?? "",
          cctvAlarmVendor: site.cctvModule?.alarmVendor ?? "",
          cctvCameraIp: site.cctvModule?.cameraIp ?? "",
          cctvAlarmIp: site.cctvModule?.alarmIp ?? "",
          cctvCameraUser: "",
          cctvAlarmUser: "",
          cctvCameraPasswordNew: "",
          cctvAlarmPasswordNew: "",
          cctvCameraPasswordSet: !!site.cctvModule?.cameraPasswordSet,
          cctvAlarmPasswordSet: !!site.cctvModule?.alarmPasswordSet,
          posVendor: site.posModule?.vendor ?? "",
          posManaged: !!site.posModule?.managed,
          posSunmiSiteName: site.posModule?.sunmiSiteName ?? "",
          posTerminalIp: site.posModule?.terminalIp ?? "",
          endpointAteraCustomerName:
            site.endpointModule?.ateraCustomerName ?? "",
          coverage: (site.coverage ?? {}) as Record<string, string>,
        }}
      />

      <AdminSiteEditor siteId={site.id} devices={devices} />
    </div>
  );
}
