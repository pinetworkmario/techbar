import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import { findSiteByName, siteDisplayName } from "@/lib/unifi";

export async function POST(
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

  const body = await req.json().catch(() => ({}));
  const identifier =
    typeof body.siteIdentifier === "string"
      ? body.siteIdentifier
      : site.networkModule?.siteIdentifier ?? "";

  if (!identifier.trim()) {
    return NextResponse.json(
      { error: "Site identifier required (set vendor=ubiquiti + identifier)" },
      { status: 400 },
    );
  }

  try {
    const match = await findSiteByName(identifier);
    if (!match) {
      return NextResponse.json(
        {
          error: `No UniFi site matching "${identifier}". Verify the friendly name in unifi.ui.com → Site Manager (this is the "desc" field, not the random short ID).`,
        },
        { status: 404 },
      );
    }
    const counts = match.statistics?.counts ?? {};
    const total = counts.totalDevice ?? 0;
    const offline = counts.offlineDevice ?? 0;
    const online = Math.max(0, total - offline);
    const display = siteDisplayName(match);

    return NextResponse.json({
      ok: true,
      message: `Linked to UniFi site "${display}" — ${total} devices (${online} online, ${offline} offline)`,
      site: {
        siteId: match.siteId,
        hostId: match.hostId,
        name: display,
        controllerId: match.meta?.name,
        gatewayMac: match.meta?.gatewayMac,
      },
      counts: { total, online, offline },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "UniFi sync failed", detail: String(e) },
      { status: 502 },
    );
  }
}
