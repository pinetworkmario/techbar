import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { canAccessSite, getCurrentUser } from "@/lib/auth";
import {
  assetNumber,
  deviceCategory,
  devicePhotoUrl,
  getDevicesForSite,
  getSiteById,
} from "@/lib/data";
import { getDeviceOverrides } from "@/lib/store";
import { DeviceDetailClient } from "./DeviceDetailClient";

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ siteId: string; deviceId: string }>;
}) {
  const { siteId, deviceId } = await params;
  const me = await getCurrentUser();
  if (!me)
    redirect(`/login?next=/portal/sites/${siteId}/devices/${deviceId}`);
  const site = getSiteById(siteId);
  if (!site) notFound();
  if (!canAccessSite(me, site.id)) redirect("/portal/sites");

  const device = getDevicesForSite(siteId).find((d) => d.id === deviceId);
  if (!device) notFound();

  const overrides = await getDeviceOverrides();
  const override = overrides[device.id] ?? {};

  return (
    <DeviceDetailClient
      siteId={site.id}
      siteName={site.name}
      device={{
        id: device.id,
        name: device.name,
        type: device.type,
        category: deviceCategory(device.type),
        location: device.location,
        brand: device.brand,
        model: device.model,
        serialNumber: device.serialNumber,
        status: device.status,
        lifecycleStage: device.lifecycleStage,
        warrantyExpiry: device.warrantyExpiry,
        lastMaintenance: device.lastMaintenance,
        nextMaintenance: device.nextMaintenance,
        serviceCoverage: device.serviceCoverage as string[],
        assetNumber: assetNumber(device),
        photoUrl: devicePhotoUrl(device),
        hasUploadedPhoto: !!device.photoUrl,
        notes: override.notes ?? "",
        gallery: override.gallery ?? [],
      }}
      backLink={
        <Link
          href={`/portal/sites/${site.id}`}
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {site.name}
        </Link>
      }
    />
  );
}
