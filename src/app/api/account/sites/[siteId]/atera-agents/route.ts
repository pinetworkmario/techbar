import { NextResponse } from "next/server";
import { canAccessSite, getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import { findCustomerByName, listAgentsForCustomer } from "@/lib/atera";

interface CacheEntry {
  ts: number;
  payload: unknown;
}
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ siteId: string }> },
) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { siteId } = await ctx.params;
  const site = sites.find((s) => s.id === siteId);
  if (!site)
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  if (!canAccessSite(me, site.id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const customerName = site.endpointModule?.ateraCustomerName?.trim();
  if (!customerName) {
    return NextResponse.json({
      ok: true,
      configured: false,
      agents: [],
      message: "Atera customer not linked for this site.",
    });
  }

  const cached = CACHE.get(siteId);
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return NextResponse.json(cached.payload);
  }

  try {
    const cust = await findCustomerByName(customerName);
    if (!cust) {
      const payload = {
        ok: true,
        configured: true,
        customerName,
        customerFound: false,
        agents: [],
        message: `No Atera customer matching "${customerName}".`,
      };
      CACHE.set(siteId, { ts: Date.now(), payload });
      return NextResponse.json(payload);
    }
    const agents = await listAgentsForCustomer(cust.CustomerID);
    const payload = {
      ok: true,
      configured: true,
      customerName: cust.CustomerName,
      customerId: cust.CustomerID,
      customerFound: true,
      checkedAt: new Date().toISOString(),
      agents: agents.map((a) => ({
        machineName: a.MachineName,
        agentName: a.AgentName,
        online: a.Online,
        os: a.OS,
        osType: a.OSType,
        ips: a.IpAddresses,
        macs: a.MacAddresses,
        lastUser: a.LastLoginUser,
        lastReboot: a.LastRebootTime,
        version: a.AgentVersion,
        vendor: a.Vendor,
        model: a.VendorBrandModel,
        memoryMb: a.Memory,
        processor: a.Processor,
      })),
    };
    CACHE.set(siteId, { ts: Date.now(), payload });
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json(
      { error: "Atera fetch failed", detail: String(e) },
      { status: 502 },
    );
  }
}
