/**
 * Microsoft Graph mail sender.
 *
 * Sends mail as the configured M365_MAIL_FROM mailbox using Application
 * permissions (client_credentials). The Azure app (AI-Mail-Send) holds the
 * Mail.Send Application role; mailbox scope should be limited by an Exchange
 * ApplicationAccessPolicy so this secret can only act as bot@.
 */

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  const tenant = process.env.M365_TENANT_ID;
  const clientId = process.env.M365_CLIENT_ID;
  const clientSecret = process.env.M365_CLIENT_SECRET;
  if (!tenant || !clientId || !clientSecret) {
    throw new Error("M365 credentials missing (M365_TENANT_ID/CLIENT_ID/CLIENT_SECRET)");
  }

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  const json = (await res.json()) as TokenResponse;
  if (!json.access_token) {
    throw new Error(`Token request failed: ${json.error}: ${json.error_description}`);
  }
  cachedToken = {
    value: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600),
  };
  return json.access_token;
}

export interface SendMailInput {
  to: string | string[];
  subject: string;
  /** Plain text. Either body or html is required. */
  body?: string;
  /** HTML. Takes precedence over body if both set. */
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  /** Override the From address. Defaults to M365_MAIL_FROM. */
  from?: string;
  /** Persist a copy in Sent Items (default true). */
  saveToSent?: boolean;
}

export interface SendMailResult {
  ok: boolean;
  status: number;
  error?: string;
}

function recipients(addrs?: string | string[]) {
  if (!addrs) return undefined;
  const arr = Array.isArray(addrs) ? addrs : [addrs];
  return arr
    .filter((a) => a && a.trim())
    .map((a) => ({ emailAddress: { address: a.trim() } }));
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const from = input.from ?? process.env.M365_MAIL_FROM;
  if (!from) {
    return { ok: false, status: 0, error: "M365_MAIL_FROM not configured" };
  }
  if (!input.body && !input.html) {
    return { ok: false, status: 0, error: "either body or html required" };
  }

  let token: string;
  try {
    token = await getAccessToken();
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }

  const message = {
    subject: input.subject,
    body: input.html
      ? { contentType: "HTML", content: input.html }
      : { contentType: "Text", content: input.body ?? "" },
    toRecipients: recipients(input.to),
    ccRecipients: recipients(input.cc),
    bccRecipients: recipients(input.bcc),
    replyTo: recipients(input.replyTo),
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message,
        saveToSentItems: input.saveToSent ?? true,
      }),
    },
  );

  if (res.status === 202) return { ok: true, status: 202 };
  const text = await res.text().catch(() => "");
  return { ok: false, status: res.status, error: text.slice(0, 500) };
}

export function mailConfigured(): boolean {
  return !!(
    process.env.M365_TENANT_ID &&
    process.env.M365_CLIENT_ID &&
    process.env.M365_CLIENT_SECRET &&
    process.env.M365_MAIL_FROM
  );
}
