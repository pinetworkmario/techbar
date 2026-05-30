import { NextResponse } from "next/server";
import { getCurrentUser, isInternal } from "@/lib/auth";
import { tickets } from "@/lib/data";
import { persistTickets } from "@/lib/server-data";
import { recordActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notifications";
import { listUsers } from "@/lib/store";
import type { TicketStatus } from "@/lib/types";

/** All user IDs with access to a site (L1 + their L2 contacts). */
async function userIdsForSite(siteId: string): Promise<string[]> {
  const users = await listUsers();
  return users
    .filter((u) => !u.disabled && !u.isAdmin)
    .filter((u) => Object.prototype.hasOwnProperty.call(u.permissions, siteId))
    .map((u) => u.id);
}

const VALID_STATUS: TicketStatus[] = [
  "New",
  "In Progress",
  "Waiting for Customer",
  "Scheduled",
  "Resolved",
  "Closed",
];

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me || !isInternal(me))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const t = tickets.find((x) => x.id === id);
  if (!t)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const prevStatus = t.status;
  if (typeof b.status === "string" && VALID_STATUS.includes(b.status))
    t.status = b.status;
  if (typeof b.assignedTeam === "string") t.assignedTeam = b.assignedTeam.trim();
  if (typeof b.latestUpdate === "string") t.latestUpdate = b.latestUpdate.trim();
  if (typeof b.description === "string") {
    const v = b.description.trim();
    t.description = v || undefined;
  }
  await persistTickets();
  if (prevStatus !== t.status) {
    void recordActivity(
      "ticket",
      `${t.number} status changed: ${prevStatus} → ${t.status}`,
    );
    void userIdsForSite(t.siteId).then((ids) =>
      notifyMany(
        ids,
        "ticket_status",
        `${t.number}: ${prevStatus} → ${t.status}`,
        "/portal/tickets",
      ),
    );
  }
  return NextResponse.json({ ok: true, ticket: t });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me || !isInternal(me))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const i = tickets.findIndex((x) => x.id === id);
  if (i === -1)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  tickets.splice(i, 1);
  await persistTickets();
  return NextResponse.json({ ok: true });
}
