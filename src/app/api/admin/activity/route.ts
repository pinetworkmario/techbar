import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listActivity } from "@/lib/activity";

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const limit = Math.max(
    1,
    Math.min(500, Number(url.searchParams.get("limit")) || 100),
  );
  return NextResponse.json({ entries: listActivity(limit) });
}
