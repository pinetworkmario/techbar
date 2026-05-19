import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { mailConfigured, sendMail } from "@/lib/mail-graph";

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!mailConfigured()) {
    return NextResponse.json(
      { error: "M365 mail not configured (M365_* env missing)" },
      { status: 500 },
    );
  }

  let body: { to?: string; subject?: string; body?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const to = body.to?.trim();
  if (!to) return NextResponse.json({ error: "'to' required" }, { status: 400 });

  const result = await sendMail({
    to,
    subject: body.subject || `techbar test — ${new Date().toISOString()}`,
    body:
      body.body ||
      `This is a test email from techbar (sent by ${me.email}).\n\nIf you received this, M365 Graph sendMail is wired up correctly.`,
    html: body.html,
  });

  return NextResponse.json(result, { status: result.ok ? 202 : 500 });
}
