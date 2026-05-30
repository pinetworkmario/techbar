import { NextResponse } from "next/server";
import { canAccessModule, canAccessSite, getCurrentUser } from "@/lib/auth";
import { devices, sites } from "@/lib/data";
import { refreshSiteStatus } from "@/lib/ruijie-sync";

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
  if (!canAccessModule(me, site.id, "network"))
    return NextResponse.json(
      { error: "Module not available for your account" },
      { status: 403 },
    );
  try {
    const result = await refreshSiteStatus(site);
    const fresh = devices
      .filter((d) => d.siteId === site.id)
      .map((d) => ({ id: d.id, serialNumber: d.serialNumber, status: d.status }));
    return NextResponse.json({
      ok: true,
      ...result,
      checkedAt: new Date().toISOString(),
      devices: fresh,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Refresh failed", detail: String(e) },
      { status: 500 },
    );
  }
}
