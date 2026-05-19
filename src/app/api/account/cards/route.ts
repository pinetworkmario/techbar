import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import {
  paymentCards,
  persistCards,
  type PaymentCard,
} from "@/lib/store-cards";

const VALID_BRANDS: PaymentCard["brand"][] = [
  "Visa",
  "Mastercard",
  "Amex",
  "Other",
];

export async function GET() {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cards = paymentCards.filter((c) => c.userId === me.id);
  return NextResponse.json({ cards });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const brand: PaymentCard["brand"] = VALID_BRANDS.includes(body.brand)
    ? body.brand
    : "Other";
  const last4 = String(body.last4 || "").replace(/\D/g, "").slice(-4);
  if (last4.length !== 4)
    return NextResponse.json(
      { error: "Last 4 digits required" },
      { status: 400 },
    );
  const expMonth = Number(body.expMonth);
  const expYear = Number(body.expYear);
  if (
    !Number.isInteger(expMonth) ||
    expMonth < 1 ||
    expMonth > 12 ||
    !Number.isInteger(expYear) ||
    expYear < new Date().getFullYear() ||
    expYear > 2100
  ) {
    return NextResponse.json(
      { error: "Invalid expiry" },
      { status: 400 },
    );
  }
  const cardholderName = String(body.cardholderName || "").trim();
  if (!cardholderName)
    return NextResponse.json(
      { error: "Cardholder name required" },
      { status: 400 },
    );

  const mine = paymentCards.filter((c) => c.userId === me.id);
  const isDefault = mine.length === 0; // first card auto-default
  const autopay = body.autopay === true;

  const card: PaymentCard = {
    id: "card-" + randomBytes(6).toString("hex"),
    userId: me.id,
    brand,
    last4,
    expMonth,
    expYear,
    cardholderName,
    isDefault,
    autopay,
    addedAt: new Date().toISOString(),
  };
  paymentCards.push(card);
  await persistCards();
  return NextResponse.json({ ok: true, card });
}
