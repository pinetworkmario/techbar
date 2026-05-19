import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  buildSlackAuthorizeUrl,
  generateNonce,
  generateState,
  slackSsoConfigured,
} from "@/lib/slack-sso";

const STATE_TTL_SEC = 300;

export async function GET(req: Request) {
  if (!slackSsoConfigured()) {
    return NextResponse.json(
      { error: "Slack SSO not configured" },
      { status: 500 },
    );
  }
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "";

  const state = generateState();
  const nonce = generateNonce();

  const c = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.PORTAL_HTTPS === "1",
    sameSite: "lax" as const,
    path: "/",
    maxAge: STATE_TTL_SEC,
  };
  c.set("pi_slack_state", state, opts);
  c.set("pi_slack_nonce", nonce, opts);
  if (next) c.set("pi_slack_next", next, opts);

  return NextResponse.redirect(buildSlackAuthorizeUrl(state, nonce));
}
