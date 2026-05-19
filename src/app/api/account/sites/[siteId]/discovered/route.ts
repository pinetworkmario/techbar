import { NextResponse } from "next/server";
import { canAccessSite, getCurrentUser } from "@/lib/auth";
import { devices, sites } from "@/lib/data";
import { discoverForSite } from "@/lib/discovery-server";
import type { DiscoveryCategory } from "@/lib/discovery";

const VALID: DiscoveryCategory[] = ["voice", "cctv", "pos"];

const MAC_RE = /^[0-9A-Fa-f]{2}([:-][0-9A-Fa-f]{2}){5}$/;

export async function GET(
  req: Request,
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

  const url = new URL(req.url);
  const cat = url.searchParams.get("category") as DiscoveryCategory | null;
  if (!cat || !VALID.includes(cat))
    return NextResponse.json(
      { error: "category must be one of voice|cctv|pos" },
      { status: 400 },
    );

  // Build the set of MACs already adopted into managed inventory at this site.
  // Adopted devices store the MAC as serialNumber (see /admin/.../adopt).
  const adoptedMacs = new Set<string>();
  for (const d of devices) {
    if (d.siteId !== site.id) continue;
    if (typeof d.serialNumber === "string" && MAC_RE.test(d.serialNumber)) {
      adoptedMacs.add(d.serialNumber.toUpperCase());
    }
  }

  const result = await discoverForSite(site.id, site.ruijieGroupId, cat, {
    excludeMacs: adoptedMacs,
    lanSubnet: site.lanSubnet,
    dhcpScope: site.dhcpScope,
  });
  return NextResponse.json({
    ok: true,
    source: result.source,
    subnet: result.subnet,
    dhcpScope: result.dhcpScope,
    devices: result.devices,
    checkedAt: new Date().toISOString(),
  });
}
