import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { canAccessSite, getCurrentUser } from "@/lib/auth";
import { tickets } from "@/lib/data";
import { persistTickets } from "@/lib/server-data";
import { recordActivity } from "@/lib/activity";
import type { TicketComment } from "@/lib/types";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const t = tickets.find((x) => x.id === id);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccessSite(me, t.siteId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const text = (body.text ?? "").trim();
  if (!text)
    return NextResponse.json({ error: "Empty comment" }, { status: 400 });

  const comment: TicketComment = {
    id: `c-${randomBytes(4).toString("hex")}`,
    authorId: me.id,
    authorName: me.name || me.email,
    authorRole: me.isAdmin ? "admin" : "customer",
    text: text.slice(0, 4000),
    createdAt: new Date().toISOString(),
  };
  t.comments = [...(t.comments ?? []), comment];
  await persistTickets();
  void recordActivity(
    "ticket",
    `${t.number}: comment by ${comment.authorRole} ${me.email}`,
  );
  return NextResponse.json({ ok: true, comment });
}
