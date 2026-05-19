import { NextResponse } from "next/server";
import { canAccessSite, getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import { persistSites } from "@/lib/server-data";
import { syntheticOutageCheck } from "@/lib/access-network";
import { realOutageCheckForSite } from "@/lib/outage-real";

export async function POST(
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

  // Prefer real Carbon data when this site is linked; otherwise synthesize.
  let report = await realOutageCheckForSite(site);
  if (!report) {
    report = syntheticOutageCheck(
      site.id,
      site.accessNetwork?.type,
      site.accessNetwork?.carrier,
    );
  }
  site.outageReport = report;
  site.updatedAt = new Date().toISOString();
  await persistSites();
  return NextResponse.json({ ok: true, report });
}

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
  return NextResponse.json({
    ok: true,
    report: site.outageReport ?? null,
    accessNetwork: site.accessNetwork ?? null,
  });
}
