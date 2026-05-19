import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { orders, persistOrders } from "@/lib/store-catalog";
import type { OrderStatus } from "@/lib/catalog-types";

const VALID: OrderStatus[] = [
  "Pending",
  "Quoted",
  "Approved",
  "Completed",
  "Rejected",
];

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const o = orders.find((x) => x.id === id);
  if (!o)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const body = await req.json();
  if (typeof body.status === "string" && VALID.includes(body.status))
    o.status = body.status as OrderStatus;
  if (typeof body.adminNote === "string") o.adminNote = body.adminNote.trim();
  o.updatedAt = new Date().toISOString();
  await persistOrders();
  return NextResponse.json({ ok: true, order: o });
}
