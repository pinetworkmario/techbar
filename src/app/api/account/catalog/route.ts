import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { catalog } from "@/lib/store-catalog";

export async function GET() {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = catalog.filter((c) => c.active !== false);
  return NextResponse.json({ items });
}
