import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import { createSiteGroup, listSiteGroups } from "@/lib/site-groups";

export async function GET() {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true, groups: listSiteGroups() });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    siteIds?: string[];
  };
  const name = (body.name ?? "").trim();
  if (!name)
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  const validSiteIds = (body.siteIds ?? []).filter((id) =>
    sites.some((s) => s.id === id),
  );
  const g = await createSiteGroup({
    name,
    description: body.description,
    siteIds: validSiteIds,
  });
  return NextResponse.json({ ok: true, group: g });
}
