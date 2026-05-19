import "server-only";
import { promises as fs } from "fs";
import path from "path";

interface RuijieEnv {
  base: string;
  appid: string;
  secret: string;
}

let _env: RuijieEnv | null = null;
async function loadEnv(): Promise<RuijieEnv> {
  if (_env) return _env;
  const envPath = path.join(process.cwd(), "data", "ruijie.env");
  const raw = await fs.readFile(envPath, "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  if (!out.RUIJIE_CLOUD_BASE || !out.RUIJIE_APPID || !out.RUIJIE_SECRET) {
    throw new Error("Ruijie credentials missing in data/ruijie.env");
  }
  _env = {
    base: out.RUIJIE_CLOUD_BASE.replace(/\/+$/, ""),
    appid: out.RUIJIE_APPID,
    secret: out.RUIJIE_SECRET,
  };
  return _env;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}
let _tok: CachedToken | null = null;

async function authToken(): Promise<{ base: string; token: string }> {
  const e = await loadEnv();
  const now = Date.now();
  if (_tok && _tok.expiresAt > now) return { base: e.base, token: _tok.token };
  const url = `${e.base}/service/api/oauth20/client/access_token?token=d63dss0a81e4415a889ac5b78fsc904a`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ appid: e.appid, secret: e.secret }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Ruijie auth HTTP ${res.status}`);
  const j = (await res.json()) as { code?: number; accessToken?: string; msg?: string };
  if (j.code !== 0 || !j.accessToken)
    throw new Error(`Ruijie auth failed: ${JSON.stringify(j)}`);
  _tok = { token: j.accessToken, expiresAt: now + 25 * 60 * 1000 };
  return { base: e.base, token: j.accessToken };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Ruijie GET ${url} HTTP ${res.status}`);
  return (await res.json()) as T;
}

export interface RuijieGroup {
  groupId: number;
  name: string;
  type: "ROOT" | "LOCATION" | "BUILDING" | string;
  subGroups?: RuijieGroup[];
}

export interface RuijieDevice {
  serialNumber: string;
  productClass: string;
  productType: string;
  commonType: "AP" | "SWITCH" | "GATEWAY" | string;
  hardwareVersion?: string;
  softwareVersion?: string;
  onlineStatus: "ON" | "OFF" | "NEVER_ONLINE" | string;
  name?: string;
  aliasName?: string;
  groupId?: number;
  groupName?: string;
  parentGroupName?: string;
  localIp?: string;
  cpeIp?: string;
  mac?: string;
  lastOnline?: number;
}

export async function getGroupTree(): Promise<RuijieGroup> {
  const { base, token } = await authToken();
  const j = await getJson<{ code: number; groups: RuijieGroup }>(
    `${base}/service/api/group/single/tree?depth=BUILDING&access_token=${token}`,
  );
  return j.groups;
}

/** Walk tree depth-first, yielding [node, parentPath]. */
export function walkGroups(
  root: RuijieGroup,
  visit: (node: RuijieGroup, path: string[]) => void,
  path: string[] = [],
): void {
  visit(root, path);
  for (const child of root.subGroups || []) {
    walkGroups(child, visit, [...path, root.name]);
  }
}

/**
 * Try to match a portal site name to a Ruijie group (BUILDING).
 * Strategy: tokenize site name, try fuzzy variants.
 */
export async function findGroupForSiteName(
  siteName: string,
): Promise<{ groupId: number; groupName: string } | null> {
  const root = await getGroupTree();
  const candidates: RuijieGroup[] = [];
  walkGroups(root, (n) => {
    if (n.type === "BUILDING") candidates.push(n);
  });
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[_-]/g, "");
  const target = norm(siteName);
  // Try exact normalized match first
  const exact = candidates.find((c) => norm(c.name) === target);
  if (exact) return { groupId: exact.groupId, groupName: exact.name };
  // Substring contains both ways
  const subMatches = candidates.filter(
    (c) => norm(c.name).includes(target) || target.includes(norm(c.name)),
  );
  if (subMatches.length === 1) {
    const m = subMatches[0];
    return { groupId: m.groupId, groupName: m.name };
  }
  if (subMatches.length > 1) {
    // Prefer the shortest name match (most specific) and avoid 4G suffix variants
    subMatches.sort((a, b) => {
      const aPenalty = /4g$/i.test(a.name) ? 100 : 0;
      const bPenalty = /4g$/i.test(b.name) ? 100 : 0;
      return a.name.length + aPenalty - (b.name.length + bPenalty);
    });
    const top = subMatches[0];
    return { groupId: top.groupId, groupName: top.name };
  }
  return null;
}

export async function listDevicesForGroup(
  groupId: number,
): Promise<RuijieDevice[]> {
  const { base, token } = await authToken();
  const out: RuijieDevice[] = [];
  for (const ct of ["AP", "SWITCH", "GATEWAY"] as const) {
    let page = 1;
    while (true) {
      const url = `${base}/service/api/maint/devices?common_type=${ct}&group_id=${groupId}&page=${page}&per_page=200&access_token=${token}`;
      const r = await getJson<{
        code: number;
        deviceList?: RuijieDevice[];
        totalCount?: number;
      }>(url);
      if (r.code !== 0) break;
      const lst = r.deviceList || [];
      for (const d of lst) {
        d.commonType = ct;
        out.push(d);
      }
      const total = r.totalCount || 0;
      if (lst.length === 0 || out.filter((x) => x.commonType === ct).length >= total)
        break;
      page += 1;
    }
  }
  return out;
}

export interface GatewayLanInfo {
  port: number | string;
  alias?: string;
  ipAddr: string;
  ipMask: string;
  dhcp?: {
    startIp: string;
    endIp: string;
    subnetMask: string;
    defaultRouter: string;
    lease?: number | string;
  };
}

/** Pull the LAN-side interface + DHCP scope from a Ruijie gateway. */
export async function getGatewayLanInfo(
  sn: string,
): Promise<GatewayLanInfo | null> {
  const { base, token } = await authToken();
  try {
    const j = await getJson<{
      code: number;
      data?: Array<{
        port: number | string;
        alias?: string;
        type?: string;
        ipAddr?: string;
        ipMask?: string;
        dhcpInfo?: {
          startIp?: string;
          endIp?: string;
          subnetMask?: string;
          defaultRouter?: string;
          lease?: number | string;
        };
      }>;
    }>(`${base}/service/api/gateway/intf/info/${sn}?access_token=${token}`);
    if (j.code !== 0) return null;
    const lanPorts = (j.data || []).filter((p) => p.type === "LAN");
    if (lanPorts.length === 0) return null;
    // Prefer a LAN port that has a DHCP pool configured
    const withDhcp = lanPorts.find(
      (p) => p.dhcpInfo?.startIp && p.dhcpInfo.endIp,
    );
    const p = withDhcp || lanPorts[0];
    if (!p.ipAddr) return null;
    return {
      port: p.port,
      alias: p.alias,
      ipAddr: p.ipAddr,
      ipMask: p.ipMask || "255.255.255.0",
      dhcp:
        p.dhcpInfo && p.dhcpInfo.startIp && p.dhcpInfo.endIp
          ? {
              startIp: p.dhcpInfo.startIp,
              endIp: p.dhcpInfo.endIp,
              subnetMask:
                p.dhcpInfo.subnetMask || p.ipMask || "255.255.255.0",
              defaultRouter: p.dhcpInfo.defaultRouter || p.ipAddr,
              lease: p.dhcpInfo.lease,
            }
          : undefined,
    };
  } catch {
    return null;
  }
}

/** Lightweight: just returns SN→onlineStatus map for a group. */
export async function getStatusMapForGroup(
  groupId: number,
): Promise<Map<string, "ON" | "OFF" | "NEVER_ONLINE">> {
  const devs = await listDevicesForGroup(groupId);
  const m = new Map<string, "ON" | "OFF" | "NEVER_ONLINE">();
  for (const d of devs) {
    if (d.serialNumber)
      m.set(
        d.serialNumber,
        (d.onlineStatus as "ON" | "OFF" | "NEVER_ONLINE") || "NEVER_ONLINE",
      );
  }
  return m;
}
