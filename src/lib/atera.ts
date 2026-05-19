import "server-only";

const BASE = "https://app.atera.com/api/v3";
const TIMEOUT_MS = 15000;

export interface AteraCustomer {
  CustomerID: number;
  CustomerName: string;
  Domain?: string;
  Address?: string;
  City?: string;
}

export interface AteraAgent {
  AgentID: string;
  DeviceGuid: string;
  MachineName: string;
  AgentName: string;
  CustomerID: number;
  CustomerName: string;
  Online: boolean;
  OS?: string;
  OSType?: string;
  IpAddresses?: string[];
  MacAddresses?: string[];
  LastLoginUser?: string;
  LastRebootTime?: string;
  AgentVersion?: string;
  Vendor?: string;
  VendorBrandModel?: string;
  VendorSerialNumber?: string;
  Memory?: number;
  Processor?: string;
  Motherboard?: string;
  SystemDrive?: string;
  Domain?: string;
  DomainName?: string;
}

interface ListEnvelope<T> {
  items: T[];
  totalItemCount: number;
  page: number;
  itemsInPage: number;
  totalPages: number;
  nextLink?: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.ATERA_API_KEY;
  if (!key) throw new Error("ATERA_API_KEY not configured");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "X-API-KEY": key,
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`atera ${path}: HTTP ${r.status} ${body.slice(0, 200)}`);
    }
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

/** Walk all pages of a list endpoint, collecting items. Atera caps itemsInPage
 * at 50. Stops at maxPages to avoid runaway loops. */
async function listAll<T>(
  pathBase: string,
  maxPages = 20,
): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const env = await call<ListEnvelope<T>>(
      `${pathBase}${pathBase.includes("?") ? "&" : "?"}itemsInPage=50&page=${page}`,
    );
    out.push(...env.items);
    if (page >= env.totalPages) break;
  }
  return out;
}

/** Find a customer by name (case-insensitive, exact then partial). */
export async function findCustomerByName(
  name: string,
): Promise<AteraCustomer | null> {
  const want = name.trim().toLowerCase();
  if (!want) return null;
  const all = await listAll<AteraCustomer>("/customers");
  const exact = all.find(
    (c) => c.CustomerName.trim().toLowerCase() === want,
  );
  if (exact) return exact;
  return (
    all.find((c) =>
      c.CustomerName.toLowerCase().includes(want),
    ) ?? null
  );
}

export async function listAgentsForCustomer(
  customerId: number,
): Promise<AteraAgent[]> {
  return listAll<AteraAgent>(`/agents/customer/${customerId}`);
}
