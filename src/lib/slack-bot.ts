/**
 * Slack bot for techbar — posts handoff notifications + claim/resolve updates.
 *
 * Uses the PI Techbar Portal Slack app's bot token (SLACK_BOT_TOKEN).
 * Notifications land in SLACK_HANDOFF_CHANNEL (default #techbar-handoffs).
 * The bot must be invited to that channel: /invite @PI Techbar Portal
 */

interface PostMessageResp {
  ok: boolean;
  ts?: string;
  channel?: string;
  error?: string;
}

export function slackBotConfigured(): boolean {
  return !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_HANDOFF_CHANNEL);
}

async function postMessage(input: {
  channel: string;
  text: string;
  thread_ts?: string;
  blocks?: unknown[];
}): Promise<PostMessageResp> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return { ok: false, error: "SLACK_BOT_TOKEN missing" };
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(input),
  });
  return (await res.json()) as PostMessageResp;
}

export interface HandoffPayload {
  id: string;
  siteName: string;
  userEmail: string;
  requestedAt: string;
  reason?: string;
  transcript: string;
}

/** Posts a new handoff request to the configured channel. Returns Slack ts. */
export async function notifyHandoffCreated(
  h: HandoffPayload,
): Promise<string | null> {
  if (!slackBotConfigured()) return null;
  const channel = process.env.SLACK_HANDOFF_CHANNEL ?? "#techbar-handoffs";
  const text = `:wave: New chat handoff *${h.id}* — ${h.siteName}`;
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:wave: *New chat handoff* — \`${h.id}\`\n*Site:* ${h.siteName}\n*From:* ${h.userEmail}\n*Reason:* ${h.reason ?? "_not provided_"}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "*Recent transcript:*\n```" +
          h.transcript.slice(0, 1500).replace(/```/g, "ʼʼʼ") +
          "```",
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<https://techbar.pinetwork.com.au/tech/handoffs|Open in techbar> · requested ${new Date(h.requestedAt).toLocaleString()}`,
        },
      ],
    },
  ];
  try {
    const r = await postMessage({ channel, text, blocks });
    if (!r.ok) {
      console.warn("slack handoff post failed", r.error);
      return null;
    }
    return r.ts ?? null;
  } catch (e) {
    console.warn("slack handoff post threw", e);
    return null;
  }
}

/** Posts a claim / resolve update as a threaded reply to the original message. */
export async function notifyHandoffUpdate(
  threadTs: string | undefined,
  action: "claimed" | "resolved",
  by: string,
): Promise<void> {
  if (!slackBotConfigured() || !threadTs) return;
  const channel = process.env.SLACK_HANDOFF_CHANNEL ?? "#techbar-handoffs";
  const emoji = action === "claimed" ? ":raising_hand:" : ":white_check_mark:";
  const text = `${emoji} ${action === "claimed" ? "Claimed" : "Resolved"} by ${by}`;
  try {
    const r = await postMessage({ channel, thread_ts: threadTs, text });
    if (!r.ok) console.warn("slack handoff thread reply failed", r.error);
  } catch (e) {
    console.warn("slack handoff thread reply threw", e);
  }
}
