import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkNbnOutage, type NbnOutageResult } from "@/lib/nbn-outage";

// 5-min in-memory cache keyed by normalised address (lower-cased, trimmed).
const cache = new Map<string, { ts: number; result: NbnOutageResult }>();
const TTL_MS = 5 * 60 * 1000;

export const maxDuration = 60;

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    address?: string;
    force?: boolean;
  };
  const address = (body.address || "").trim();
  if (!address)
    return NextResponse.json({ error: "address required" }, { status: 400 });

  const key = address.toLowerCase();
  if (!body.force) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < TTL_MS) {
      const { debug: _debug, ...publicResult } = cached.result;
      void _debug;
      return NextResponse.json({ ...publicResult, cached: true });
    }
  }

  const result = await checkNbnOutage(address);
  cache.set(key, { ts: Date.now(), result });
  const { debug: _debug, ...publicResult } = result;
  void _debug;
  return NextResponse.json({ ...publicResult, cached: false });
}
