import "server-only";
import { lookupOui, normaliseMac, refineKind } from "./oui";
import {
  discoverDevices as syntheticDiscover,
  type DiscoveredDevice,
  type DiscoveryCategory,
} from "./discovery";

interface RuijieClient {
  mac: string;
  userIp?: string;
  ssid?: string;
  sn?: string;
  deviceAliasName?: string; // AP alias the client is connected to
  band?: string;
  rssi?: number;
  score?: number;
  onlineTime?: number;
  activeTime?: number;
  hostname?: string;
}

interface CacheEntry {
  ts: number;
  clients: RuijieClient[];
}
const CLIENT_CACHE = new Map<number, CacheEntry>();
const TTL_MS = 60_000;

async function ruijieToken(): Promise<{ base: string; token: string }> {
  // Re-use the central Ruijie auth helper without creating a circular import.
  const { getStatusMapForGroup: _ } = await import("./ruijie");
  void _;
  // We don't have a public helper that just returns the token; replicate here.
  const { promises: fs } = await import("fs");
  const path = await import("path");
  const raw = await fs.readFile(
    path.join(process.cwd(), "data", "ruijie.env"),
    "utf8",
  );
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  const base = (env.RUIJIE_CLOUD_BASE || "").replace(/\/+$/, "");
  const url = `${base}/service/api/oauth20/client/access_token?token=d63dss0a81e4415a889ac5b78fsc904a`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ appid: env.RUIJIE_APPID, secret: env.RUIJIE_SECRET }),
    cache: "no-store",
  });
  const j = (await res.json()) as { code?: number; accessToken?: string };
  if (j.code !== 0 || !j.accessToken) throw new Error("Ruijie auth failed");
  return { base, token: j.accessToken };
}

async function fetchClients(groupId: number): Promise<RuijieClient[]> {
  const cached = CLIENT_CACHE.get(groupId);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.clients;
  try {
    const { base, token } = await ruijieToken();
    const out: RuijieClient[] = [];
    let page = 1;
    while (true) {
      const r = await fetch(
        `${base}/logbizagent/logbiz/api/sta/sta_users?access_token=${token}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            groupId,
            pageSize: 200,
            pageIndex: page,
            staType: "currentUser",
          }),
          cache: "no-store",
        },
      );
      if (!r.ok) break;
      const j = (await r.json()) as {
        code?: number;
        list?: RuijieClient[];
        totalCount?: number;
      };
      const lst = j.list || [];
      out.push(...lst);
      const total = j.totalCount || 0;
      if (lst.length === 0 || out.length >= total) break;
      page += 1;
      if (page > 10) break;
    }
    CLIENT_CACHE.set(groupId, { ts: Date.now(), clients: out });
    return out;
  } catch (e) {
    console.warn("[discovery-server] Ruijie client fetch failed:", e);
    return [];
  }
}

function pingFromQuality(score?: number): number {
  if (score == null) return 12;
  if (score >= 90) return 1 + ((score * 7) % 3);
  if (score >= 80) return 4 + ((score * 7) % 5);
  if (score >= 70) return 9 + ((score * 7) % 12);
  return 25 + ((score * 7) % 35);
}

function classifyClient(
  c: RuijieClient,
  category: DiscoveryCategory,
): DiscoveredDevice | null {
  if (!c.mac) return null;
  const oui = lookupOui(c.mac);
  if (!oui) return null;
  if (oui.hint === "infrastructure") return null; // skip Ruijie's own gear
  if (oui.hint !== category) return null;
  const kind = refineKind(oui, c.deviceAliasName || c.hostname);
  const macNorm = normaliseMac(c.mac);
  return {
    id: `disc-real-${macNorm}`,
    category,
    kind,
    vendor: oui.vendor,
    model: oui.typicalKind ? `${oui.vendor} ${oui.typicalKind}` : oui.vendor,
    ip: c.userIp || "—",
    mac: macNorm,
    pingMs: pingFromQuality(c.score),
    hostname: c.deviceAliasName || c.hostname || undefined,
  };
}

/**
 * Get discovered devices for a site & category.
 * - If site has a Ruijie groupId → query live client list, classify by OUI.
 * - If real returns 0 in this category → fall back to synthetic so the
 *   prototype demo still shows data.
 * - excludeMacs: MACs of devices already adopted into managed inventory; they
 *   are dropped from both real and synthetic results so adopted devices stop
 *   appearing in the discovery list.
 */
export interface DhcpInfo {
  startIp: string;
  endIp: string;
  subnetMask: string;
  gatewayIp: string;
}

export interface DiscoverForSiteOpts {
  excludeMacs?: ReadonlySet<string>;
  /** Site's detected LAN /24 (e.g. "192.168.99"). Used by synthetic fallback
   * so simulated devices appear on the real subnet, not a hash-derived one. */
  lanSubnet?: string;
  /** DHCP scope reported by the gateway, used to constrain synthetic IPs. */
  dhcpScope?: DhcpInfo;
}

function lastOctet(ip: string): number | undefined {
  const m = ip.match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : undefined;
}

export async function discoverForSite(
  siteId: string,
  ruijieGroupId: number | undefined,
  category: DiscoveryCategory,
  opts: DiscoverForSiteOpts = {},
): Promise<{
  source: "ruijie" | "synthetic" | "ruijie+empty-fallback";
  devices: DiscoveredDevice[];
  subnet?: string;
  dhcpScope?: DhcpInfo;
}> {
  const exclude = opts.excludeMacs ?? new Set<string>();
  const subnet = opts.lanSubnet;
  const dhcpScope = opts.dhcpScope;
  let hostRange: { min: number; max: number } | undefined;
  if (dhcpScope) {
    const lo = lastOctet(dhcpScope.startIp);
    const hi = lastOctet(dhcpScope.endIp);
    if (lo != null && hi != null && hi >= lo) hostRange = { min: lo, max: hi };
  }
  function notExcluded(d: DiscoveredDevice): boolean {
    return !exclude.has(d.mac.toUpperCase());
  }

  if (!ruijieGroupId) {
    return {
      source: "synthetic",
      devices: syntheticDiscover(siteId, category, {
        excludeMacs: exclude,
        subnet,
        hostRange,
      }),
      subnet,
      dhcpScope,
    };
  }
  const clients = await fetchClients(ruijieGroupId);
  const matched = clients
    .map((c) => classifyClient(c, category))
    .filter((d): d is DiscoveredDevice => d !== null)
    .filter(notExcluded);
  if (matched.length === 0) {
    return {
      source: "ruijie+empty-fallback",
      devices: syntheticDiscover(siteId, category, {
        excludeMacs: exclude,
        subnet,
        hostRange,
      }),
      subnet,
      dhcpScope,
    };
  }
  return { source: "ruijie", devices: matched, subnet, dhcpScope };
}
