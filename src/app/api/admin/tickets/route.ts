import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { tickets } from "@/lib/data";

export async function GET() {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // newest first
  const sorted = tickets.slice().sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || ""),
  );
  return NextResponse.json({ tickets: sorted });
}
