import { NextResponse } from "next/server";
import { getCurrentUser, isInternal } from "@/lib/auth";
import { findHandoff, updateHandoff } from "@/lib/chat-handoffs";
import { notifyHandoffUpdate } from "@/lib/slack-bot";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me || !isInternal(me))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    status?: "claimed" | "resolved";
  };
  if (body.status !== "claimed" && body.status !== "resolved") {
    return NextResponse.json({ error: "status required" }, { status: 400 });
  }
  const existing = findHandoff(id);
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch =
    body.status === "claimed"
      ? {
          status: "claimed" as const,
          claimedBy: me.email,
          claimedAt: new Date().toISOString(),
        }
      : { status: "resolved" as const, resolvedAt: new Date().toISOString() };
  const updated = await updateHandoff(id, patch);
  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Post a threaded update back to Slack — fire-and-forget.
  notifyHandoffUpdate(existing.slackThreadTs, body.status, me.email).catch(
    (e) => console.warn("slack handoff update failed", e),
  );

  return NextResponse.json({ ok: true, handoff: updated });
}
