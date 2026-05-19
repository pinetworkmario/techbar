import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeCodeForIdToken,
  expectedTeamId,
  slackSsoConfigured,
} from "@/lib/slack-sso";
import { findUserByEmail } from "@/lib/store";
import { SESSION_COOKIE, cookieOptions, createSession } from "@/lib/auth";

function publicOrigin(req: Request): string {
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const proto =
    req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

function back(req: Request, slackError: string): NextResponse {
  const u = new URL("/login", publicOrigin(req));
  u.searchParams.set("slack_error", slackError);
  return NextResponse.redirect(u);
}

export async function GET(req: Request) {
  if (!slackSsoConfigured()) return back(req, "Slack SSO not configured");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const slackErr = url.searchParams.get("error");
  if (slackErr) return back(req, `Slack returned ${slackErr}`);
  if (!code || !state) return back(req, "Missing code or state");

  const c = await cookies();
  const expectedState = c.get("pi_slack_state")?.value;
  const next = c.get("pi_slack_next")?.value ?? "";
  c.delete("pi_slack_state");
  c.delete("pi_slack_nonce");
  c.delete("pi_slack_next");
  if (!expectedState || expectedState !== state) {
    return back(req, "State mismatch, please try again");
  }

  let claims;
  try {
    claims = await exchangeCodeForIdToken(code);
  } catch {
    return back(req, "Slack token exchange failed");
  }

  const teamWanted = expectedTeamId();
  const teamGot = claims["https://slack.com/team_id"];
  if (teamWanted && teamGot !== teamWanted) {
    return back(req, "Not a member of the allowed Slack workspace");
  }

  if (!claims.email) return back(req, "Slack did not return an email");

  const user = await findUserByEmail(claims.email);
  if (!user || user.disabled) {
    return back(req, `No portal account for ${claims.email}`);
  }

  const { token, expiresAt } = await createSession(user.id);
  c.set(SESSION_COOKIE, token, cookieOptions(expiresAt));

  const dest =
    next ||
    (user.isAdmin
      ? "/admin"
      : user.isTech
        ? "/tech/sites"
        : "/portal/sites");
  return NextResponse.redirect(new URL(dest, publicOrigin(req)));
}
