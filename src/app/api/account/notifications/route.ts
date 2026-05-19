import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listNotifications,
  markRead,
  unreadCount,
} from "@/lib/notifications";

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const limit = Math.max(
    1,
    Math.min(100, Number(url.searchParams.get("limit")) || 50),
  );
  return NextResponse.json({
    notifications: listNotifications(me.id, { limit }),
    unread: unreadCount(me.id),
  });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    action?: "mark_read" | "mark_all_read";
    ids?: string[];
  };
  if (body.action === "mark_all_read") {
    await markRead(me.id, "all");
    return NextResponse.json({ ok: true });
  }
  if (body.action === "mark_read" && Array.isArray(body.ids)) {
    await markRead(me.id, body.ids.filter((x): x is string => typeof x === "string"));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
