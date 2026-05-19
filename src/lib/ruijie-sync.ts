import "server-only";
import { randomBytes } from "crypto";
import { devices, deviceCategory, sites } from "./data";
import { persistDevices, persistSites } from "./server-data";
import { productImageUrl } from "./product-image";
import {
  findGroupForSiteName,
  getGatewayLanInfo,
  getStatusMapForGroup,
  listDevicesForGroup,
  type RuijieDevice,
} from "./ruijie";
import type { Device, DeviceType, Site } from "./types";

const TYP3: Record<string, string> = {
  network: "NET",
  voice: "VOI",
  cctv: "CCT",
  pos: "POS",
  endpoint: "EPT",
};

function typeFromCommonType(ct: string): DeviceType {
  if (ct === "AP") return "Wi-Fi AP";
  if (ct === "SWITCH") return "Switch";
  return "Router"; // GATEWAY
}

function makeName(siteName: string, alias: string, sn: string, ct: string): string {
  const cleanAlias = (alias || "").trim();
  if (cleanAlias && cleanAlias.toLowerCase() !== "ruijie") {
    return `${siteName.replace(/^Okami\s+/i, "")} ${cleanAlias}`;
  }
  const short = ct === "AP" ? "AP" : ct === "SWITCH" ? "Switch" : "Router";
  return `${siteName.replace(/^Okami\s+/i, "")} ${short} (${sn.slice(-6)})`;
}

function detectLanSubnet(devs: { localIp?: string }[]): string | undefined {
  const counts = new Map<string, number>();
  const RFC1918 = /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/;
  for (const d of devs) {
    const ip = d.localIp;
    if (!ip || !RFC1918.test(ip)) continue;
    const m = ip.match(/^(\d+\.\d+\.\d+)\./);
    if (!m) continue;
    counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  }
  let best: { subnet: string; n: number } | null = null;
  for (const [s, n] of counts) {
    if (!best || n > best.n) best = { subnet: s, n };
  }
  return best?.subnet;
}

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

export interface SyncResult {
  matched: { groupId: number; groupName: string } | null;
  imported: number;
  updated: number;
  skipped: number;
  message: string;
}

/**
 * Find Ruijie group for a portal site (by name) and import all devices.
 * Idempotent: existing devices with the same serialNumber are kept; new ones
 * are added; status is refreshed for everything.
 */
export async function syncSiteFromRuijie(
  site: Site,
  opts: { groupName?: string } = {},
): Promise<SyncResult> {
  let match: { groupId: number; groupName: string } | null = null;
  if (opts.groupName) {
    // Re-resolve groupId for a known group name (admin pinned it earlier)
    const found = await findGroupForSiteName(opts.groupName);
    if (found) match = found;
  } else {
    match = await findGroupForSiteName(site.name);
  }
  if (!match) {
    return {
      matched: null,
      imported: 0,
      updated: 0,
      skipped: 0,
      message: `No Ruijie group matched site name "${site.name}"`,
    };
  }

  // Pin the match onto the site for future syncs / refreshes
  if (
    site.ruijieGroupId !== match.groupId ||
    site.ruijieGroupName !== match.groupName
  ) {
    site.ruijieGroupId = match.groupId;
    site.ruijieGroupName = match.groupName;
    site.updatedAt = new Date().toISOString();
    await persistSites();
  }

  const ruijieDevs = await listDevicesForGroup(match.groupId);

  const bySerial = new Map<string, Device>();
  for (const d of devices) {
    if (d.siteId === site.id && d.serialNumber)
      bySerial.set(d.serialNumber, d);
  }

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  for (const r of ruijieDevs) {
    const sn = r.serialNumber;
    if (!sn) {
      skipped += 1;
      continue;
    }
    const ptype = typeFromCommonType(r.commonType);
    const status: Device["status"] = r.onlineStatus === "ON" ? "Active" : "Offline";
    const existing = bySerial.get(sn);
    if (existing) {
      existing.status = status;
      existing.brand = "Ruijie";
      if (r.productClass) existing.model = r.productClass;
      // Don't overwrite admin-edited fields aggressively (name/location/photoUrl/assetNumber)
      if (!existing.photoUrl) {
        existing.photoUrl = productImageUrl({
          type: ptype,
          model: r.productClass,
          brand: "Ruijie",
        });
      }
      updated += 1;
    } else {
      const id = "dev-" + randomBytes(6).toString("hex");
      const device: Device = {
        id,
        name: makeName(site.name, r.aliasName || r.name || "", sn, r.commonType),
        type: ptype,
        siteId: site.id,
        location:
          r.commonType === "AP" ? "Ceiling mount" : "Comms cabinet",
        brand: "Ruijie",
        model: r.productClass || "Unknown",
        serialNumber: sn,
        status,
        serviceCoverage: ["network", "it_support"],
        warrantyExpiry: "2028-01-01",
        lifecycleStage: "In Service",
        assetNumber: nextAssetNumber(site.id, ptype),
        photoUrl: productImageUrl({
          type: ptype,
          model: r.productClass,
          brand: "Ruijie",
        }),
      };
      devices.push(device);
      imported += 1;
    }
  }

  // Update site's denormalized device count
  site.devicesCount = devices.filter((d) => d.siteId === site.id).length;

  // Detect dominant LAN /24 from Ruijie devices' localIp; used by
  // synthetic discovery so simulated devices land on the site's real subnet.
  const detected = detectLanSubnet(ruijieDevs);
  if (detected && site.lanSubnet !== detected) {
    site.lanSubnet = detected;
  }

  // Try to enrich with the gateway's DHCP pool. Uses the first GATEWAY device
  // we found at this site. Fails open — sync still succeeds if this errors.
  const gateway = ruijieDevs.find((d) => d.commonType === "GATEWAY");
  if (gateway?.serialNumber) {
    try {
      const lan = await getGatewayLanInfo(gateway.serialNumber);
      if (lan?.dhcp) {
        site.dhcpScope = {
          startIp: lan.dhcp.startIp,
          endIp: lan.dhcp.endIp,
          subnetMask: lan.dhcp.subnetMask,
          gatewayIp: lan.dhcp.defaultRouter,
        };
        // Prefer the gateway's own LAN /24 over the device-frequency guess
        const m = lan.ipAddr.match(/^(\d+\.\d+\.\d+)\./);
        if (m) site.lanSubnet = m[1];
      }
    } catch {
      /* ignore — leave whatever we already have */
    }
  }

  site.updatedAt = new Date().toISOString();
  await persistDevices();
  await persistSites();

  return {
    matched: match,
    imported,
    updated,
    skipped,
    message: `Matched ${match.groupName}: ${imported} new, ${updated} updated, ${skipped} skipped`,
  };
}

/**
 * Light-weight refresh: pull current onlineStatus only, update Device.status
 * for the devices already in the portal that have a serialNumber matching
 * what Ruijie returns. Returns the number of devices updated.
 */
export async function refreshSiteStatus(
  site: Site,
): Promise<{ checked: number; changed: number; matched: boolean }> {
  if (!site.ruijieGroupId) {
    // Try to resolve by name once
    const m = await findGroupForSiteName(site.name);
    if (!m) return { checked: 0, changed: 0, matched: false };
    site.ruijieGroupId = m.groupId;
    site.ruijieGroupName = m.groupName;
    await persistSites();
  }
  const statusMap = await getStatusMapForGroup(site.ruijieGroupId);
  let checked = 0;
  let changed = 0;
  for (const d of devices) {
    if (d.siteId !== site.id || !d.serialNumber) continue;
    const live = statusMap.get(d.serialNumber);
    if (!live) continue;
    checked += 1;
    const desired: Device["status"] = live === "ON" ? "Active" : "Offline";
    if (d.status !== desired) {
      d.status = desired;
      changed += 1;
    }
  }
  if (changed > 0) await persistDevices();
  return { checked, changed, matched: true };
}
