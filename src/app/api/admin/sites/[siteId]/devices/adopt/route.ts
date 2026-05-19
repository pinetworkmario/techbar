import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { devices, deviceCategory, sites } from "@/lib/data";
import { persistDevices, persistSites } from "@/lib/server-data";
import { productImageUrl } from "@/lib/product-image";
import type {
  Device,
  DeviceType,
  ServiceKey,
} from "@/lib/types";
import type { DiscoveryCategory } from "@/lib/discovery";

const TYP3: Record<string, string> = {
  network: "NET",
  voice: "VOI",
  cctv: "CCT",
  pos: "POS",
  endpoint: "EPT",
};

function nextAssetNumber(siteId: string, type: DeviceType): string {
  const cat = deviceCategory(type);
  const typ3 = TYP3[cat] || "DEV";
  const siteCode = siteId.replace(/^site-/, "").slice(0, 4).toUpperCase();
  const existing = devices.filter(
    (d) => d.siteId === siteId && deviceCategory(d.type) === cat,
  ).length;
  const seq = String(existing + 1).padStart(3, "0");
  return `PI-${siteCode}-${typ3}-${seq}`;
}

function kindToDeviceType(
  category: DiscoveryCategory,
  kind: string,
): DeviceType {
  const k = kind.toLowerCase();
  if (category === "voice") return "Phone Handset";
  if (category === "cctv") {
    if (k.includes("nvr") || k.includes("dvr")) return "NVR";
    if (k.includes("alarm")) return "Alarm Panel";
    return "CCTV Camera";
  }
  // pos
  if (k.includes("printer") || k.includes("receipt")) return "Receipt Printer";
  if (k.includes("kitchen") || k.includes("kds")) return "KDS";
  if (k.includes("customer") || k.includes("cds")) return "CDS";
  if (k.includes("eftpos")) return "Payment Terminal";
  if (k.includes("server")) return "Server";
  return "POS Terminal";
}

const SERVICE_BY_CAT: Record<DiscoveryCategory, ServiceKey[]> = {
  voice: ["voice", "it_support"],
  cctv: ["cctv"],
  pos: ["pos"],
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ siteId: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { siteId } = await ctx.params;
  const site = sites.find((s) => s.id === siteId);
  if (!site)
    return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const body = (await req.json()) as {
    discovery?: {
      category?: DiscoveryCategory;
      kind?: string;
      vendor?: string;
      model?: string;
      ip?: string;
      mac?: string;
      hostname?: string;
    };
    overrides?: { name?: string; type?: DeviceType; location?: string };
  };
  const d = body.discovery;
  if (!d || !d.category || !d.mac)
    return NextResponse.json(
      { error: "discovery payload required (category + mac)" },
      { status: 400 },
    );

  // Skip if a managed device already has this MAC as serial number
  const existingByMac = devices.find(
    (x) => x.siteId === siteId && x.serialNumber === d.mac,
  );
  if (existingByMac)
    return NextResponse.json(
      {
        error: `Device with MAC ${d.mac} already adopted as ${existingByMac.assetNumber || existingByMac.id}`,
      },
      { status: 409 },
    );

  const inferredType = body.overrides?.type
    ? body.overrides.type
    : kindToDeviceType(d.category, d.kind || "");
  const id = "dev-" + randomBytes(6).toString("hex");
  const name =
    body.overrides?.name?.trim() ||
    `${d.vendor ?? "Device"} ${d.model ?? d.kind ?? ""}`.trim();
  const location =
    body.overrides?.location?.trim() ||
    (d.hostname ? `${d.hostname} (${d.ip})` : `Auto-discovered at ${d.ip}`);

  const device: Device = {
    id,
    name,
    type: inferredType,
    siteId,
    location,
    brand: d.vendor || "Unknown",
    model: d.model || (d.kind ?? "Unknown"),
    serialNumber: d.mac,
    status: "Active",
    serviceCoverage: SERVICE_BY_CAT[d.category],
    warrantyExpiry: "2028-01-01",
    lifecycleStage: "In Service",
    assetNumber: nextAssetNumber(siteId, inferredType),
    photoUrl: productImageUrl({
      type: inferredType,
      model: d.model,
      brand: d.vendor,
    }),
  };
  devices.push(device);

  site.devicesCount = devices.filter((d) => d.siteId === siteId).length;
  site.updatedAt = new Date().toISOString();
  await persistDevices();
  await persistSites();
  return NextResponse.json({ ok: true, device });
}
