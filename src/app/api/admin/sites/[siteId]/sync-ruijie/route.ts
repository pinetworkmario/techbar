import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import { syncSiteFromRuijie } from "@/lib/ruijie-sync";

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
  try {
    const result = await syncSiteFromRuijie(site, {
      groupName: typeof body.groupName === "string" ? body.groupName : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: "Sync failed", detail: String(e) },
      { status: 500 },
    );
  }
}
