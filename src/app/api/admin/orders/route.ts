import { NextResponse } from "next/server";
import { getCurrentUser, isInternal } from "@/lib/auth";
import { orders } from "@/lib/store-catalog";

export async function GET() {
  const me = await getCurrentUser();
  if (!me || !isInternal(me))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sorted = [...orders].sort((a, b) =>
    a.createdAt > b.createdAt ? -1 : 1,
  );
  return NextResponse.json({ orders: sorted });
}
