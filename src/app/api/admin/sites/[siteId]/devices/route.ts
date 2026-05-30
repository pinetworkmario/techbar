import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser, isInternal } from "@/lib/auth";
import { deviceCategory, devices, sites } from "@/lib/data";
import { persistDevices } from "@/lib/server-data";
import type {
  Device,
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

const TYP3: Record<string, string> = {
  network: "NET",
  voice: "VOI",
  cctv: "CCT",
  pos: "POS",
  endpoint: "EPT",
  it_support: "ITS",
  projects: "PRJ",
};

function defaultAssetNumber(
  siteId: string,
  siteCode: string,
  type: DeviceType,
): string {
  const cat = deviceCategory(type);
  const typ3 = TYP3[cat] || "DEV";
  const existing = devices.filter(
    (d) => d.siteId === siteId && deviceCategory(d.type) === cat,
  ).length;
  const seq = String(existing + 1).padStart(3, "0");
  return `PI-${siteCode.toUpperCase().slice(0, 4)}-${typ3}-${seq}`;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ siteId: string }> },
) {
  const me = await getCurrentUser();
  if (!me || !isInternal(me))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { siteId } = await ctx.params;
  const site = sites.find((s) => s.id === siteId);
  if (!site)
    return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  const type = body.type as DeviceType;
  if (!name || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: "Name and a valid device type are required" },
      { status: 400 },
    );
  }
  const location = String(body.location || "").trim();
  const brand = String(body.brand || "").trim();
  const model = String(body.model || "").trim();
  const serialNumber = String(body.serialNumber || "").trim();
  const status: DeviceStatus = VALID_STATUSES.includes(body.status)
    ? body.status
    : "Active";
  const lifecycleStage: LifecycleStage = VALID_LIFECYCLE.includes(
    body.lifecycleStage,
  )
    ? body.lifecycleStage
    : "In Service";
  const serviceCoverage: ServiceKey[] = Array.isArray(body.serviceCoverage)
    ? body.serviceCoverage.filter((s: string) =>
        VALID_SERVICES.includes(s as ServiceKey),
      )
    : [];
  const warrantyExpiry = String(body.warrantyExpiry || "").trim();
  const customAsset = String(body.assetNumber || "").trim();

  const id = "dev-" + randomBytes(6).toString("hex");
  const siteCode = siteId.replace(/^site-/, "").slice(0, 4);
  const assetNumber = customAsset || defaultAssetNumber(siteId, siteCode, type);

  const device: Device = {
    id,
    name,
    type,
    siteId,
    location,
    brand,
    model,
    serialNumber,
    status,
    serviceCoverage,
    warrantyExpiry: warrantyExpiry || new Date().toISOString().slice(0, 10),
    lifecycleStage,
    assetNumber,
  };
  devices.push(device);

  // Update site's denormalized device count
  site.devicesCount = devices.filter((d) => d.siteId === siteId).length;

  await persistDevices();
  // Persist sites too because devicesCount changed
  const { persistSites } = await import("@/lib/server-data");
  await persistSites();

  return NextResponse.json({ ok: true, device });
}
