import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import { deleteSiteGroup, updateSiteGroup } from "@/lib/site-groups";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    siteIds?: string[];
  };
  const patch: { name?: string; description?: string; siteIds?: string[] } = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (body.description !== undefined) patch.description = body.description;
  if (Array.isArray(body.siteIds)) {
    patch.siteIds = body.siteIds.filter((sid) =>
      sites.some((s) => s.id === sid),
    );
  }
  const updated = await updateSiteGroup(id, patch);
  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, group: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const ok = await deleteSiteGroup(id);
  if (!ok)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
