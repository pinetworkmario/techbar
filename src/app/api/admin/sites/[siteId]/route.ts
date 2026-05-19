import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { devices, sites } from "@/lib/data";
import { persistDevices, persistSites } from "@/lib/server-data";
import { clearCctvCredentials, setCctvCredentials } from "@/lib/cctv-credentials";
import type {
  AccessNetworkType,
  AlarmVendor,
  CameraVendor,
  CoverageStatus,
  NetworkVendor,
  PosVendor,
  ServiceKey,
  SiteHealth,
  SupportPack,
  VoiceMode,
} from "@/lib/types";

const VALID_COVERAGE: CoverageStatus[] = ["Yes", "No", "Partial", "Recommended"];

const VALID_ACCESS_TYPES: AccessNetworkType[] = [
  "NBN_FTTP",
  "NBN_FTTC",
  "NBN_FTTN",
  "NBN_HFC",
  "NBN_FW",
  "NBN_EE",
  "Opticomm",
  "Starlink",
  "Lightning",
  "4G",
  "5G",
  "Other",
];

const VALID_HEALTH: SiteHealth[] = ["Healthy", "Warning", "Critical"];
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
const VALID_PACKS: SupportPack[] = [
  "isp_only",
  "essential",
  "protection",
  "enterprise_protection",
  "no_support",
];

const VALID_NETWORK_VENDORS: NetworkVendor[] = ["ruijie", "ubiquiti", "tplink"];
const VALID_VOICE_MODES: VoiceMode[] = ["default_pbx", "custom_domain"];
const VALID_CAMERA_VENDORS: CameraVendor[] = [
  "hikvision",
  "dahua",
  "tplink",
  "other",
];
const VALID_ALARM_VENDORS: AlarmVendor[] = [
  "hikvision",
  "dahua",
  "ajax",
  "bosch",
  "other",
];
const VALID_POS_VENDORS: PosVendor[] = ["Abacus", "Pisell", "Square"];

function trimOrUndef(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

export async function PATCH(
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

  const body = await req.json();
  if (typeof body.name === "string") site.name = body.name.trim();
  if (typeof body.state === "string") site.state = body.state.trim();
  if (typeof body.address === "string") site.address = body.address.trim();
  if (typeof body.notes === "string") {
    const v = body.notes.trim();
    site.notes = v ? v : undefined;
  }
  if (typeof body.ruijieGroupName === "string") {
    const v = body.ruijieGroupName.trim();
    site.ruijieGroupName = v ? v : undefined;
  }
  if (VALID_HEALTH.includes(body.health)) site.health = body.health;
  if (Array.isArray(body.servicesCovered)) {
    site.servicesCovered = body.servicesCovered.filter((s: string) =>
      VALID_SERVICES.includes(s as ServiceKey),
    );
  }
  if (body.mainContact && typeof body.mainContact === "object") {
    site.mainContact = {
      id: site.mainContact.id,
      name: String(body.mainContact.name || site.mainContact.name).trim(),
      role: String(body.mainContact.role || site.mainContact.role).trim(),
      phone: String(body.mainContact.phone || site.mainContact.phone).trim(),
      email: String(body.mainContact.email || site.mainContact.email).trim(),
    };
  }
  if (Array.isArray(body.recommendations)) {
    site.recommendations = body.recommendations
      .filter((r: unknown) => typeof r === "string")
      .map((r: string) => r.trim())
      .filter(Boolean);
  }
  if (VALID_PACKS.includes(body.supportPack)) {
    site.supportPack = body.supportPack;
  }
  if (body.accessNetwork && typeof body.accessNetwork === "object") {
    const a = body.accessNetwork as Record<string, unknown>;
    const type = VALID_ACCESS_TYPES.includes(a.type as AccessNetworkType)
      ? (a.type as AccessNetworkType)
      : site.accessNetwork?.type ?? "Other";
    const failoverType =
      a.failoverType && VALID_ACCESS_TYPES.includes(a.failoverType as AccessNetworkType)
        ? (a.failoverType as AccessNetworkType)
        : undefined;
    site.accessNetwork = {
      type,
      carrier: typeof a.carrier === "string" ? a.carrier.trim() : "",
      planSpeed: typeof a.planSpeed === "string" ? a.planSpeed.trim() || undefined : undefined,
      accountId: typeof a.accountId === "string" ? a.accountId.trim() || undefined : undefined,
      hasFailover: a.hasFailover === true,
      failoverType,
    };
  }
  if (body.carbonServiceId === null) {
    site.carbonServiceId = undefined;
    site.carbonPoiName = undefined;
    site.carbonServiceAlias = undefined;
  } else if (
    typeof body.carbonServiceId === "number" &&
    Number.isInteger(body.carbonServiceId)
  ) {
    site.carbonServiceId = body.carbonServiceId;
    if (typeof body.carbonPoiName === "string")
      site.carbonPoiName = body.carbonPoiName;
    if (typeof body.carbonServiceAlias === "string")
      site.carbonServiceAlias = body.carbonServiceAlias;
  }
  if (body.networkModule === null) {
    site.networkModule = undefined;
  } else if (body.networkModule && typeof body.networkModule === "object") {
    const n = body.networkModule as Record<string, unknown>;
    if (VALID_NETWORK_VENDORS.includes(n.vendor as NetworkVendor)) {
      site.networkModule = {
        vendor: n.vendor as NetworkVendor,
        siteIdentifier: typeof n.siteIdentifier === "string" ? n.siteIdentifier.trim() : "",
      };
    }
  }
  if (body.voiceModule === null) {
    site.voiceModule = undefined;
  } else if (body.voiceModule && typeof body.voiceModule === "object") {
    const v = body.voiceModule as Record<string, unknown>;
    const mode = VALID_VOICE_MODES.includes(v.mode as VoiceMode)
      ? (v.mode as VoiceMode)
      : "default_pbx";
    const exts = Array.isArray(v.extensions)
      ? (v.extensions as unknown[])
          .filter((x) => typeof x === "string")
          .map((x) => (x as string).trim())
          .filter(Boolean)
      : [];
    site.voiceModule = {
      mode,
      customDomain:
        mode === "custom_domain" ? trimOrUndef(v.customDomain) : undefined,
      extensions: exts,
    };
  }
  if (body.cctvModule === null) {
    site.cctvModule = undefined;
  } else if (body.cctvModule && typeof body.cctvModule === "object") {
    const c = body.cctvModule as Record<string, unknown>;
    const cameraVendor = VALID_CAMERA_VENDORS.includes(c.cameraVendor as CameraVendor)
      ? (c.cameraVendor as CameraVendor)
      : undefined;
    const alarmVendor = VALID_ALARM_VENDORS.includes(c.alarmVendor as AlarmVendor)
      ? (c.alarmVendor as AlarmVendor)
      : undefined;
    const prev = site.cctvModule ?? {};
    const cameraPwd = trimOrUndef(c.cameraPassword);
    const alarmPwd = trimOrUndef(c.alarmPassword);
    site.cctvModule = {
      cameraVendor,
      alarmVendor,
      cameraIp: trimOrUndef(c.cameraIp),
      alarmIp: trimOrUndef(c.alarmIp),
      cameraPasswordSet: cameraPwd ? true : prev.cameraPasswordSet,
      alarmPasswordSet: alarmPwd ? true : prev.alarmPasswordSet,
    };
    if (cameraPwd || alarmPwd || c.cameraUser !== undefined || c.alarmUser !== undefined) {
      await setCctvCredentials(siteId, {
        cameraPassword: cameraPwd,
        alarmPassword: alarmPwd,
        cameraUser: trimOrUndef(c.cameraUser),
        alarmUser: trimOrUndef(c.alarmUser),
      });
    }
  }
  if (body.posModule === null) {
    site.posModule = undefined;
  } else if (body.posModule && typeof body.posModule === "object") {
    const p = body.posModule as Record<string, unknown>;
    const vendor = VALID_POS_VENDORS.includes(p.vendor as PosVendor)
      ? (p.vendor as PosVendor)
      : undefined;
    const managed = p.managed === true;
    site.posModule = {
      vendor,
      managed,
      sunmiSiteName: managed ? trimOrUndef(p.sunmiSiteName) : undefined,
      terminalIp: trimOrUndef(p.terminalIp),
    };
  }
  if (body.endpointModule === null) {
    site.endpointModule = undefined;
  } else if (body.endpointModule && typeof body.endpointModule === "object") {
    const e = body.endpointModule as Record<string, unknown>;
    site.endpointModule = {
      ateraCustomerName: trimOrUndef(e.ateraCustomerName),
    };
  }
  if (body.coverage === null) {
    site.coverage = undefined;
  } else if (body.coverage && typeof body.coverage === "object") {
    const c = body.coverage as Record<string, unknown>;
    const next: Partial<Record<ServiceKey, CoverageStatus>> = {};
    for (const k of Object.keys(c)) {
      if (
        VALID_SERVICES.includes(k as ServiceKey) &&
        VALID_COVERAGE.includes(c[k] as CoverageStatus)
      ) {
        next[k as ServiceKey] = c[k] as CoverageStatus;
      }
    }
    site.coverage = next;
  }
  if (typeof body.lanSubnet === "string") {
    const v = body.lanSubnet.trim();
    if (!v) {
      site.lanSubnet = undefined;
    } else if (/^(?:10\.\d+\.\d+|192\.168\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+)$/.test(v)) {
      site.lanSubnet = v;
    } else {
      return NextResponse.json(
        { error: "lanSubnet must be a private /24 prefix like 192.168.99" },
        { status: 400 },
      );
    }
  }
  await persistSites();
  return NextResponse.json({ ok: true, site });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ siteId: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { siteId } = await ctx.params;
  const idx = sites.findIndex((s) => s.id === siteId);
  if (idx === -1)
    return NextResponse.json({ error: "Site not found" }, { status: 404 });

  sites.splice(idx, 1);

  // Cascade: remove all devices belonging to this site, plus their photos
  const removedDevices = devices.filter((d) => d.siteId === siteId);
  const remaining = devices.filter((d) => d.siteId !== siteId);
  devices.length = 0;
  devices.push(...remaining);

  // Best-effort cleanup of uploaded photos
  for (const d of removedDevices) {
    if (d.photoUrl?.startsWith("/uploads/devices/")) {
      const fp = path.join(process.cwd(), "public", d.photoUrl);
      try {
        await fs.unlink(fp);
      } catch {
        /* ignore */
      }
    }
  }

  await persistSites();
  await persistDevices();
  await clearCctvCredentials(siteId);
  return NextResponse.json({ ok: true, removedDevices: removedDevices.length });
}
