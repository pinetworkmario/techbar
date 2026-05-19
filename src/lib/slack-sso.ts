import { randomBytes } from "crypto";

const SLACK_AUTHORIZE_URL = "https://slack.com/openid/connect/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/openid.connect.token";

export interface SlackOidcClaims {
  iss: string;
  sub: string;
  aud: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  ["https://slack.com/team_id"]?: string;
  ["https://slack.com/user_id"]?: string;
  exp: number;
  iat: number;
}

export function slackSsoConfigured(): boolean {
  return !!(
    process.env.SLACK_CLIENT_ID &&
    process.env.SLACK_CLIENT_SECRET &&
    process.env.SLACK_REDIRECT_URI
  );
}

export function buildSlackAuthorizeUrl(state: string, nonce: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    scope: "openid email profile",
    client_id: process.env.SLACK_CLIENT_ID ?? "",
    redirect_uri: process.env.SLACK_REDIRECT_URI ?? "",
    state,
    nonce,
  });
  const teamId = process.env.SLACK_TEAM_ID;
  if (teamId) params.set("team", teamId);
  return `${SLACK_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForIdToken(
  code: string,
): Promise<SlackOidcClaims> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.SLACK_CLIENT_ID ?? "",
    client_secret: process.env.SLACK_CLIENT_SECRET ?? "",
    redirect_uri: process.env.SLACK_REDIRECT_URI ?? "",
    grant_type: "authorization_code",
  });
  const res = await fetch(SLACK_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as {
    ok?: boolean;
    error?: string;
    id_token?: string;
  };
  if (!json.ok || !json.id_token) {
    throw new Error(`slack token exchange failed: ${json.error ?? "no id_token"}`);
  }
  return decodeIdToken(json.id_token);
}

function decodeIdToken(token: string): SlackOidcClaims {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed id_token");
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  const json = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(json) as SlackOidcClaims;
}

export function generateState(): string {
  return randomBytes(16).toString("hex");
}

export function generateNonce(): string {
  return randomBytes(16).toString("hex");
}

export function expectedTeamId(): string | undefined {
  return process.env.SLACK_TEAM_ID;
}
