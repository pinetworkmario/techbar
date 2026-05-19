import "server-only";

const BRIDGE_BASE = process.env.CARBON_BRIDGE_URL || "http://172.16.88.3:8089";
const TIMEOUT_MS = 15000;

async function getJson<T>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BRIDGE_BASE}${path}`, {
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`carbon-bridge ${path}: HTTP ${r.status} ${body.slice(0, 200)}`);
    }
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export interface CarbonHealth {
  ok: boolean;
  ts: number;
}

export async function carbonHealth(): Promise<CarbonHealth> {
  return getJson<CarbonHealth>("/health");
}

export interface CarbonService {
  id: number;
  type?: string;
  status?: string;
  alias?: string;
  address?: string;
  service_identifier?: string;
  plan?: string;
  poi_name?: string;
  technology?: string;
  is_active_service?: boolean;
}

export interface CarbonSearchResult {
  count: number;
  services: CarbonService[];
}

export async function searchCarbonServices(opts: {
  address?: string;
  tag?: string;
  serviceType?: string;
  perPage?: number;
}): Promise<CarbonSearchResult> {
  const params = new URLSearchParams();
  if (opts.address) params.set("address", opts.address);
  if (opts.tag) params.set("tag", opts.tag);
  params.set("service_type", opts.serviceType || "nbn");
  params.set("per_page", String(opts.perPage || 25));
  return getJson<CarbonSearchResult>(`/services?${params.toString()}`);
}

export async function carbonServiceDetail(serviceId: number): Promise<CarbonService> {
  return getJson<CarbonService>(`/services/${serviceId}`);
}

export interface CarbonOutageEntry {
  ref: number;
  title: string;
  eta?: string;
  services?: string;
  areas: string[];
  start_date?: string;
  end_date?: string;
  prio?: string;
  restored?: string;
}

export interface CarbonOutageForServiceResult {
  service_id: number;
  poi: string;
  avc: string;
  status: "operational" | "outage" | "scheduled";
  checked_at: number;
  matches: {
    current: CarbonOutageEntry[];
    future: CarbonOutageEntry[];
    recent: CarbonOutageEntry[];
  };
}

export async function getCarbonOutageForService(
  serviceId: number,
): Promise<CarbonOutageForServiceResult> {
  return getJson<CarbonOutageForServiceResult>(
    `/outages/for-service/${serviceId}`,
  );
}
