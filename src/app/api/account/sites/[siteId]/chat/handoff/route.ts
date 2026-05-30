import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { canAccessSite, getCurrentUser } from "@/lib/auth";
import { getSiteById } from "@/lib/data";
import { createHandoff, updateHandoff } from "@/lib/chat-handoffs";
import { notifyHandoffCreated } from "@/lib/slack-bot";

interface InboundMsg {
  role: "user" | "assistant";
  content?: string | Array<{ type: string; text?: string }>;
}

function flatten(content: InboundMsg["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((p) => (p.type === "text" ? p.text || "" : "[image]"))
    .filter(Boolean)
    .join(" ");
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ siteId: string }> },
) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { siteId } = await ctx.params;
  const site = getSiteById(siteId);
  if (!site)
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  if (!canAccessSite(me, site.id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    reason?: string;
    messages?: InboundMsg[];
  };

  const lastMsgs = (body.messages || []).slice(-10);
  const transcript = lastMsgs
    .map((m) => `${m.role.toUpperCase()}: ${flatten(m.content).slice(0, 500)}`)
    .join("\n");

  const handoff = await createHandoff({
    id: `HO-${randomBytes(3).toString("hex").toUpperCase()}`,
    siteId: site.id,
    siteName: site.name,
    userId: me.id,
    userEmail: me.email,
    requestedAt: new Date().toISOString(),
    reason:
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim().slice(0, 200)
        : undefined,
    transcript,
  });

  // Notify PI team via Slack — fire-and-forget; persist returned ts for threading.
  notifyHandoffCreated({
    id: handoff.id,
    siteName: handoff.siteName,
    userEmail: handoff.userEmail,
    requestedAt: handoff.requestedAt,
    reason: handoff.reason,
    transcript: handoff.transcript,
  })
    .then((ts) => {
      if (ts) {
        void updateHandoff(handoff.id, { slackThreadTs: ts });
      }
    })
    .catch((e) => console.warn("slack handoff notify failed", e));

  return NextResponse.json({ ok: true, handoff });
}
