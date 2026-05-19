import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { canAccessSite, getCurrentUser } from "@/lib/auth";
import { sites, tickets } from "@/lib/data";
import { persistTickets } from "@/lib/server-data";
import { recordActivity } from "@/lib/activity";
import type { BusinessImpact, Ticket, TicketStatus } from "@/lib/types";

const VALID_IMPACT: BusinessImpact[] = [
  "No major impact",
  "Partially impacted",
  "Cannot take payments",
  "Cannot trade",
  "Security risk",
];

function nextTicketNumber(): string {
  const max = tickets.reduce((acc, t) => {
    const m = /^PI-(\d+)$/.exec(t.number);
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 1000);
  return `PI-${max + 1}`;
}

export async function POST(
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

  const b = (await req.json().catch(() => ({}))) as Partial<Ticket> & {
    deviceOrService?: string;
    issueType?: string;
    description?: string;
    businessImpact?: BusinessImpact;
  };
  const deviceOrService = (b.deviceOrService ?? "").trim();
  const issueType = (b.issueType ?? "").trim();
  const description = (b.description ?? "").trim();
  const impact = VALID_IMPACT.includes(b.businessImpact as BusinessImpact)
    ? (b.businessImpact as BusinessImpact)
    : "No major impact";
  if (!deviceOrService || !issueType)
    return NextResponse.json(
      { error: "deviceOrService and issueType required" },
      { status: 400 },
    );

  const ticket: Ticket = {
    id: `t-${randomBytes(4).toString("hex")}`,
    number: nextTicketNumber(),
    siteId: site.id,
    deviceOrService,
    issueType,
    businessImpact: impact,
    status: "New" as TicketStatus,
    createdAt: new Date().toISOString(),
    assignedTeam: "Triage",
    latestUpdate: `Ticket received from ${me.name || me.email}.`,
    description: description || undefined,
  };
  tickets.unshift(ticket);
  await persistTickets();
  void recordActivity(
    "ticket",
    `${ticket.number} created — ${site.name}: ${ticket.issueType}`,
  );
  return NextResponse.json({ ok: true, ticket });
}
