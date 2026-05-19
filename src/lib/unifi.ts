import "server-only";

const BASE = "https://api.ui.com/v1";
const TIMEOUT_MS = 15000;

export interface UnifiHost {
  id: string;
  hostname?: string;
  type?: string;
  reportedState?: { name?: string };
}

export interface UnifiSite {
  siteId: string;
  hostId: string;
  meta?: {
    /** Random short controller ID, e.g. "7soko93t". NOT the friendly name. */
    name?: string;
    /** Friendly site name set by the customer (this is what humans use). */
    desc?: string;
    timezone?: string;
    gatewayMac?: string;
  };
  statistics?: {
    counts?: {
      totalDevice?: number;
      offlineDevice?: number;
      pendingDevice?: number;
      adoptedDevice?: number;
    };
  };
}

/** Best human-readable name for a site. UniFi's `meta.name` is a random ID;
 * the actual customer-set name is in `meta.desc`. */
export function siteDisplayName(s: UnifiSite): string {
  return s.meta?.desc || s.meta?.name || s.siteId;
}

export interface UnifiDevice {
  id: string;
  name?: string;
  model?: string;
  mac?: string;
  ip?: string;
  state?: "online" | "offline" | "adopting" | string;
  uptime?: number;
  firmwareVersion?: string;
  productLine?: string;
  type?: string;
}

async function call<T>(path: string): Promise<T> {
  const key = process.env.UBIQUITI_API_KEY;
  if (!key) throw new Error("UBIQUITI_API_KEY not configured");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}${path}`, {
      headers: { "X-API-KEY": key, Accept: "application/json" },
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`unifi ${path}: HTTP ${r.status} ${body.slice(0, 200)}`);
    }
    const j = (await r.json()) as { data?: T };
    return (j.data ?? (j as unknown as T));
  } finally {
    clearTimeout(t);
  }
}

export async function listSites(): Promise<UnifiSite[]> {
  return call<UnifiSite[]>("/sites");
}

/** UniFi Site Manager API does NOT expose a per-site device listing under
 * `/v1/`. To list a site's individual devices you'd need controller-local
 * API credentials. We rely on `statistics.counts` from `listSites()` for
 * online/offline counts. */

/** Find the UniFi site whose desc (friendly name) matches `siteIdentifier`
 * (case-insensitive, trimmed). Falls back to substring match. UniFi's
 * `meta.name` is a random controller ID — we never match against it. */
export async function findSiteByName(
  siteIdentifier: string,
): Promise<UnifiSite | null> {
  const want = siteIdentifier.trim().toLowerCase();
  if (!want) return null;
  const all = await listSites();
  const exact = all.find(
    (s) => (s.meta?.desc ?? "").trim().toLowerCase() === want,
  );
  if (exact) return exact;
  const partial = all.find((s) =>
    (s.meta?.desc ?? "").toLowerCase().includes(want),
  );
  return partial ?? null;
}
