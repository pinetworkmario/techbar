import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { allowedSiteIds, getCurrentUser } from "@/lib/auth";
import { sites, tickets } from "@/lib/data";
import { catalog, orders, persistOrders } from "@/lib/store-catalog";
import { persistTickets } from "@/lib/server-data";
import { recordActivity } from "@/lib/activity";
import type { CatalogCategory, Order, OrderLine } from "@/lib/catalog-types";
import type { Ticket } from "@/lib/types";

/** Map order line category → support team that owns the work. */
const TEAM_BY_CATEGORY: Record<CatalogCategory, string> = {
  network: "Network",
  voice: "Voice",
  pos: "POS & Payments",
  cctv: "CCTV & Alarm",
  endpoint: "Endpoint",
  it_support: "IT Support",
  materials: "Operations",
};

function nextTicketNumber(): string {
  const max = tickets.reduce((acc, t) => {
    const m = /^PI-(\d+)$/.exec(t.number);
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 1000);
  return `PI-${max + 1}`;
}

/** Group lines by category and create one ticket per category, assigned to
 * the right team. Returns the ticket numbers created. */
async function spawnTicketsForOrder(
  order: Order,
  fallbackSiteId: string,
): Promise<string[]> {
  const byCategory = new Map<CatalogCategory, OrderLine[]>();
  for (const l of order.lines) {
    const arr = byCategory.get(l.category) ?? [];
    arr.push(l);
    byCategory.set(l.category, arr);
  }
  const created: string[] = [];
  for (const [cat, lines] of byCategory.entries()) {
    const siteId = lines.find((l) => l.siteId)?.siteId ?? fallbackSiteId;
    if (!siteId) continue; // no site to attach to — skip silently
    const summary = lines
      .map((l) => `${l.qty} × ${l.name} [${l.sku}]`)
      .join(", ");
    const description = `Auto-created from order ${order.number} (${order.userEmail}).
Category: ${cat}.
Items:
${lines.map((l) => `  - ${l.qty} × ${l.name} (${l.sku}) @ $${l.priceAud} ${l.billing}${l.siteName ? ` — ${l.siteName}` : ""}`).join("\n")}
${order.customerNote ? `\nCustomer note: ${order.customerNote}` : ""}`;
    const ticket: Ticket = {
      id: `t-${randomBytes(4).toString("hex")}`,
      number: nextTicketNumber(),
      siteId,
      deviceOrService: `Order ${order.number} — ${cat}`,
      issueType: `New order: ${summary}`,
      businessImpact: "No major impact",
      status: "New",
      createdAt: new Date().toISOString(),
      assignedTeam: TEAM_BY_CATEGORY[cat] ?? "Operations",
      latestUpdate: `Auto-routed to ${TEAM_BY_CATEGORY[cat] ?? "Operations"} for fulfilment.`,
      description,
    };
    tickets.unshift(ticket);
    created.push(ticket.number);
    void recordActivity(
      "ticket",
      `${ticket.number} auto-created from order ${order.number} → ${ticket.assignedTeam}`,
    );
  }
  if (created.length > 0) await persistTickets();
  return created;
}

export async function GET() {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mine = me.isAdmin
    ? orders
    : orders.filter((o) => o.userId === me.id);
  const sorted = [...mine].sort((a, b) =>
    a.createdAt > b.createdAt ? -1 : 1,
  );
  return NextResponse.json({ orders: sorted });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const reqLines: { itemId?: string; qty?: number; siteId?: string }[] =
    Array.isArray(body.lines) ? body.lines : [];
  if (reqLines.length === 0)
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

  const allowed = new Set(
    allowedSiteIds(
      me,
      sites.map((s) => s.id),
    ),
  );

  const lines: OrderLine[] = [];
  for (const r of reqLines) {
    const item = catalog.find((c) => c.id === r.itemId);
    if (!item) continue;
    const qty = Math.max(1, Math.min(100, Number(r.qty) || 1));
    let siteId: string | undefined;
    let siteName: string | undefined;
    if (item.siteScoped) {
      if (!r.siteId)
        return NextResponse.json(
          { error: `Item "${item.name}" needs a site selection.` },
          { status: 400 },
        );
      if (!allowed.has(r.siteId))
        return NextResponse.json(
          { error: `You do not have access to site ${r.siteId}.` },
          { status: 403 },
        );
      siteId = r.siteId;
      siteName = sites.find((s) => s.id === r.siteId)?.name;
    }
    lines.push({
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      priceAud: item.priceAud,
      billing: item.billing,
      qty,
      siteId,
      siteName,
    });
  }
  if (lines.length === 0)
    return NextResponse.json(
      { error: "No valid items in cart" },
      { status: 400 },
    );

  const oneOff = lines
    .filter((l) => l.billing === "one_off")
    .reduce((s, l) => s + l.priceAud * l.qty, 0);
  const monthly = lines
    .filter((l) => l.billing === "monthly")
    .reduce((s, l) => s + l.priceAud * l.qty, 0);

  const id = "ord-" + randomBytes(6).toString("hex");
  const number = "PI-O-" + Math.floor(20000 + Math.random() * 79999);
  const now = new Date().toISOString();
  const order: Order = {
    id,
    number,
    userId: me.id,
    userEmail: me.email,
    userName: me.name,
    createdAt: now,
    updatedAt: now,
    status: "Pending",
    lines,
    oneOffSubtotalAud: oneOff,
    monthlySubtotalAud: monthly,
    customerNote:
      typeof body.customerNote === "string" ? body.customerNote.trim() : undefined,
  };
  orders.push(order);
  await persistOrders();

  // Auto-route: spawn one ticket per category, assigned to the right team.
  // Site fallback for non-site-scoped lines = first site the user can access.
  const fallbackSiteId =
    lines.find((l) => l.siteId)?.siteId ?? [...allowed][0] ?? "";
  const ticketNumbers = await spawnTicketsForOrder(order, fallbackSiteId);

  void recordActivity(
    "service",
    `Order ${order.number} placed by ${me.email} (${order.lines.length} line${order.lines.length === 1 ? "" : "s"})`,
  );

  return NextResponse.json({ ok: true, order, tickets: ticketNumbers });
}
