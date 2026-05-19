import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { paymentCards, persistCards } from "@/lib/store-cards";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const card = paymentCards.find((c) => c.id === id && c.userId === me.id);
  if (!card)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  if (typeof body.autopay === "boolean") card.autopay = body.autopay;
  if (body.isDefault === true) {
    // Clear default on all of user's other cards, set this one
    for (const c of paymentCards) {
      if (c.userId === me.id) c.isDefault = c.id === id;
    }
  }
  await persistCards();
  return NextResponse.json({ ok: true, card });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const idx = paymentCards.findIndex(
    (c) => c.id === id && c.userId === me.id,
  );
  if (idx === -1)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const wasDefault = paymentCards[idx].isDefault;
  paymentCards.splice(idx, 1);
  // If we removed the default, promote another card to default
  if (wasDefault) {
    const next = paymentCards.find((c) => c.userId === me.id);
    if (next) next.isDefault = true;
  }
  await persistCards();
  return NextResponse.json({ ok: true });
}
