import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { devices, sites } from "@/lib/data";
import { persistDevices, persistSites } from "@/lib/server-data";
import type {
  DeviceStatus,
  DeviceType,
  LifecycleStage,
  ServiceKey,
} from "@/lib/types";

const VALID_TYPES: DeviceType[] = [
  "Router",
  "Switch",
  "Wi-Fi AP",
  "POS Terminal",
  "Payment Terminal",
  "Receipt Printer",
  "KDS",
  "CDS",
  "NVR",
  "CCTV Camera",
  "Alarm Panel",
  "Windows PC",
  "Server",
  "Android POS Device",
  "Phone Handset",
];
const VALID_STATUSES: DeviceStatus[] = [
  "Active",
  "Warning",
  "Offline",
  "In Support",
  "Not Monitored",
];
const VALID_LIFECYCLE: LifecycleStage[] = [
  "Planned",
  "Supplied",
  "Staged",
  "Installed",
  "In Service",
  "Maintenance Due",
  "Replacement Recommended",
  "Retired",
];
const VALID_SERVICES: ServiceKey[] = [
  "network",
  "fourg_backup",
  "voice",
  "pos",
  "cctv",
  "endpoint",
  "it_support",
  "microsoft",
  "projects",
];

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ siteId: string; deviceId: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { siteId, deviceId } = await ctx.params;
  const d = devices.find((x) => x.id === deviceId && x.siteId === siteId);
  if (!d)
    return NextResponse.json({ error: "Device not found" }, { status: 404 });

  const body = await req.json();
  if (typeof body.name === "string") d.name = body.name.trim();
  if (typeof body.location === "string") d.location = body.location.trim();
  if (typeof body.brand === "string") d.brand = body.brand.trim();
  if (typeof body.model === "string") d.model = body.model.trim();
  if (typeof body.serialNumber === "string")
    d.serialNumber = body.serialNumber.trim();
  if (typeof body.warrantyExpiry === "string")
    d.warrantyExpiry = body.warrantyExpiry.trim();
  if (typeof body.assetNumber === "string") {
    const v = body.assetNumber.trim();
    d.assetNumber = v ? v : undefined;
  }
  if (VALID_TYPES.includes(body.type)) d.type = body.type;
  if (VALID_STATUSES.includes(body.status)) d.status = body.status;
  if (VALID_LIFECYCLE.includes(body.lifecycleStage))
    d.lifecycleStage = body.lifecycleStage;
  if (Array.isArray(body.serviceCoverage)) {
    d.serviceCoverage = body.serviceCoverage.filter((s: string) =>
      VALID_SERVICES.includes(s as ServiceKey),
    );
  }
  await persistDevices();
  return NextResponse.json({ ok: true, device: d });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ siteId: string; deviceId: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { siteId, deviceId } = await ctx.params;
  const idx = devices.findIndex(
    (x) => x.id === deviceId && x.siteId === siteId,
  );
  if (idx === -1)
    return NextResponse.json({ error: "Device not found" }, { status: 404 });

  const removed = devices[idx];
  devices.splice(idx, 1);

  // Best-effort cleanup of uploaded photo
  if (removed.photoUrl?.startsWith("/uploads/devices/")) {
    const fp = path.join(process.cwd(), "public", removed.photoUrl);
    try {
      await fs.unlink(fp);
    } catch {
      /* ignore */
    }
  }

  // Update site's denormalized device count
  const site = sites.find((s) => s.id === siteId);
  if (site) {
    site.devicesCount = devices.filter((d) => d.siteId === siteId).length;
    await persistSites();
  }
  await persistDevices();
  return NextResponse.json({ ok: true });
}
