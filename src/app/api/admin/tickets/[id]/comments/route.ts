import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { tickets } from "@/lib/data";
import { persistTickets } from "@/lib/server-data";
import { recordActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notifications";
import { listUsers } from "@/lib/store";
import type { TicketComment } from "@/lib/types";

async function customerIdsForSite(siteId: string): Promise<string[]> {
  const users = await listUsers();
  return users
    .filter((u) => !u.disabled && !u.isAdmin)
    .filter((u) => Object.prototype.hasOwnProperty.call(u.permissions, siteId))
    .map((u) => u.id);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const t = tickets.find((x) => x.id === id);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const text = (body.text ?? "").trim();
  if (!text)
    return NextResponse.json({ error: "Empty comment" }, { status: 400 });

  const comment: TicketComment = {
    id: `c-${randomBytes(4).toString("hex")}`,
    authorId: me.id,
    authorName: me.name || me.email,
    authorRole: "admin",
    text: text.slice(0, 4000),
    createdAt: new Date().toISOString(),
  };
  t.comments = [...(t.comments ?? []), comment];
  await persistTickets();
  void recordActivity("ticket", `${t.number}: admin reply by ${me.email}`);
  void customerIdsForSite(t.siteId).then((ids) =>
    notifyMany(
      ids,
      "ticket_comment",
      `${t.number}: PI Network replied`,
      "/portal/tickets",
    ),
  );
  return NextResponse.json({ ok: true, comment });
}
