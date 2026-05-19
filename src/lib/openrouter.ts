import "server-only";

const BASE = "https://openrouter.ai/api/v1";
const TIMEOUT_MS = 60_000;
const DEFAULT_MODEL =
  process.env.OPENROUTER_CHAT_MODEL || "qwen/qwen3.6-plus";

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  /** Either a plain string or OpenAI-multimodal content array. */
  content: string | ChatContentPart[];
}

export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResult {
  text: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
}

export async function chatComplete(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<ChatResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://customerportal.pinetwork.local",
        "X-Title": "PI Network Customer Portal",
      },
      body: JSON.stringify({
        model: opts.model || DEFAULT_MODEL,
        messages,
        max_tokens: opts.maxTokens ?? 1500,
        temperature: opts.temperature ?? 0.4,
      }),
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`openrouter HTTP ${r.status} ${body.slice(0, 300)}`);
    }
    const j = (await r.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: ChatResult["usage"];
      model?: string;
    };
    const text = j.choices?.[0]?.message?.content ?? "";
    return { text, usage: j.usage, model: j.model };
  } finally {
    clearTimeout(t);
  }
}
