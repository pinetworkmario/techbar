import { NextResponse } from "next/server";
import { canAccessSite, getCurrentUser } from "@/lib/auth";
import {
  getDevicesForSite,
  getSiteById,
  getTicketsForSite,
} from "@/lib/data";
import { chatComplete, type ChatMessage } from "@/lib/openrouter";
import { getAccessTypeMeta } from "@/lib/access-network";

const MAX_HISTORY = 12;

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
    messages?: ChatMessage[];
  };
  const userMessages = (body.messages || [])
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        (typeof m.content === "string" || Array.isArray(m.content)),
    )
    .slice(-MAX_HISTORY);
  if (userMessages.length === 0 || userMessages[userMessages.length - 1].role !== "user") {
    return NextResponse.json(
      { error: "Last message must be from user" },
      { status: 400 },
    );
  }

  const devices = getDevicesForSite(siteId);
  const tickets = getTicketsForSite(siteId).slice(0, 8);
  const accessLabel = site.accessNetwork
    ? `${getAccessTypeMeta(site.accessNetwork.type).label} via ${site.accessNetwork.carrier || "unknown carrier"}`
    : "not recorded";

  const deviceLines = devices
    .slice(0, 40)
    .map(
      (d) =>
        `- ${d.name} (${d.type}) ${d.brand} ${d.model} — status ${d.status}, lifecycle ${d.lifecycleStage}${d.location ? `, location ${d.location}` : ""}`,
    )
    .join("\n");
  const ticketLines = tickets
    .map(
      (t) =>
        `- ${t.number} [${t.status}] ${t.issueType}: ${t.deviceOrService} (impact: ${t.businessImpact}) — ${t.latestUpdate}`,
    )
    .join("\n");

  const systemPrompt = `You are PI Network's customer-portal site assistant. You answer questions about ONE specific site.
Be concise and concrete. If you don't know, say so — don't invent device names, IPs, ticket numbers, contracts, or outage events.

When the customer asks something operational (e.g. "is my network down?", "what's the status of camera 3?"), answer using the context below first. If the answer requires data not in context (live device telemetry, billing detail, ticket comments), tell the customer what you'd need and offer to raise a ticket.

== Site context ==
Name: ${site.name}
Address: ${site.address}, ${site.state}
Health: ${site.health}
Support pack: ${site.supportPack ?? "not set"}
Access network: ${accessLabel}
Main contact: ${site.mainContact.name} (${site.mainContact.role}, ${site.mainContact.email})

Services covered: ${(site.servicesCovered || []).join(", ") || "none recorded"}

Module configuration:
- Network: ${site.networkModule ? `${site.networkModule.vendor} site "${site.networkModule.siteIdentifier}"` : "not configured"}
- Voice: ${site.voiceModule ? `${site.voiceModule.mode}${site.voiceModule.customDomain ? ` (${site.voiceModule.customDomain})` : ""}, exts: ${(site.voiceModule.extensions || []).join(", ") || "none"}` : "not configured"}
- CCTV / Alarm: ${site.cctvModule ? `cameras=${site.cctvModule.cameraVendor || "n/a"}, alarm=${site.cctvModule.alarmVendor || "n/a"}` : "not configured"}
- POS: ${site.posModule ? `${site.posModule.vendor || "?"} (${site.posModule.managed ? "managed" : "customer-managed"})` : "not configured"}
- Endpoint: ${site.endpointModule?.ateraCustomerName ? `Atera customer "${site.endpointModule.ateraCustomerName}"` : "not configured"}

Devices on file (${devices.length} total${devices.length > 40 ? ", showing first 40" : ""}):
${deviceLines || "(none)"}

Recent tickets (${tickets.length}):
${ticketLines || "(none)"}

Latest carrier outage check: ${site.outageReport ? `${site.outageReport.status} — ${site.outageReport.message} (${new Date(site.outageReport.checkedAt).toLocaleString()})` : "no recent check"}
`;

  try {
    const result = await chatComplete(
      [{ role: "system", content: systemPrompt }, ...userMessages],
      { maxTokens: 1200 },
    );
    return NextResponse.json({
      ok: true,
      reply: result.text,
      usage: result.usage,
      model: result.model,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Chat failed", detail: String(e) },
      { status: 502 },
    );
  }
}
