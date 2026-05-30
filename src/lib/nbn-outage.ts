import "server-only";

/**
 * NBN outage check: feed an address into NBN's public network-status surface,
 * then ask OpenRouter to extract structured status. Best-effort — NBN's UI is
 * client-rendered so the raw HTML may not contain incident data, in which case
 * the LLM falls back to whatever it can see and we return "no reported outages".
 */

const NBN_STATUS_PAGE = "https://www.nbnco.com.au/support/network-status";
const NBN_ADDRESS_LOOKUP =
  "https://www.nbnco.com.au/api/svnac/v0.0.5/address-search";
const NBN_OUTAGE_INFO =
  "https://www.nbnco.com.au/api/svnac/v0.0.5/network-outage-info";

const FETCH_TIMEOUT_MS = 12000;
const LLM_TIMEOUT_MS = 25000;

export interface NbnOutageResult {
  hasOutage: boolean;
  summary: string;
  affectedServices?: string[];
  startTime?: string;
  eta?: string;
  source: string;
  checkedAt: string;
  /** Server-side debugging breadcrumb; never shown to customer. */
  debug?: string;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; techbar-outage-check/1.0; +https://techbar.pinetwork.com.au)",
        accept: "text/html,application/json,*/*",
        ...(init?.headers || {}),
      },
    });
    return res;
  } catch {
    return null;
  }
}

interface ExtractResult {
  hasOutage: boolean;
  summary: string;
  affectedServices?: string[];
  startTime?: string;
  eta?: string;
}

async function extractWithLLM(args: {
  address: string;
  pageHtml: string;
  apiJson: unknown;
}): Promise<ExtractResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      hasOutage: false,
      summary: "OpenRouter not configured; cannot parse NBN status.",
    };
  }
  const model =
    process.env.OPENROUTER_OUTAGE_MODEL ||
    process.env.OPENROUTER_CHAT_MODEL ||
    "qwen/qwen3.6-plus";

  const truncatedHtml = args.pageHtml.slice(0, 10000);
  const truncatedJson = JSON.stringify(args.apiJson ?? null).slice(0, 4000);

  const userMsg = `Determine whether there is an active NBN outage affecting this customer address. Use the NBN status page HTML and any API data provided.

Customer address: ${args.address}

==== NBN network-status page (HTML, may be truncated) ====
${truncatedHtml}

==== NBN address/outage API data ====
${truncatedJson}

Return ONLY a JSON object matching this schema (no markdown, no code fences):
{
  "hasOutage": boolean,    // true ONLY if a current/active outage clearly affects this address area
  "summary": string,       // 1-2 plain-English sentences; if no outage, say so for this address area
  "affectedServices": string[]?,  // e.g. ["NBN FTTP", "Voice"], only if outage
  "startTime": string?,    // ISO if explicitly mentioned
  "eta": string?           // ISO if explicitly mentioned
}

If neither source contains incident information, set hasOutage=false and summary="No reported NBN outages for this address area."`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "http-referer": "https://techbar.pinetwork.com.au",
        "x-title": "techbar NBN outage check",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are a network operations analyst. Respond with valid JSON only, no markdown.",
          },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
    if (!res.ok) {
      return {
        hasOutage: false,
        summary: `Could not parse NBN status (LLM HTTP ${res.status}).`,
      };
    }
    const j = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = j.choices?.[0]?.message?.content?.trim() ?? "";
    if (!content) {
      return { hasOutage: false, summary: "LLM returned no content." };
    }
    const cleaned = content.replace(/^```json\s*/i, "").replace(/```$/, "");
    const parsed = JSON.parse(cleaned) as ExtractResult & Record<string, unknown>;
    return {
      hasOutage: !!parsed.hasOutage,
      summary: String(parsed.summary ?? "").slice(0, 600),
      affectedServices: Array.isArray(parsed.affectedServices)
        ? (parsed.affectedServices as string[]).slice(0, 8)
        : undefined,
      startTime:
        typeof parsed.startTime === "string" ? parsed.startTime : undefined,
      eta: typeof parsed.eta === "string" ? parsed.eta : undefined,
    };
  } catch (e) {
    return {
      hasOutage: false,
      summary: `Could not parse NBN status (${(e as Error).message}).`,
    };
  }
}

export async function checkNbnOutage(
  address: string,
): Promise<NbnOutageResult> {
  const checkedAt = new Date().toISOString();
  const cleanAddr = address.trim();
  if (!cleanAddr) {
    return {
      hasOutage: false,
      summary: "Address is empty.",
      source: "no-input",
      checkedAt,
    };
  }

  let apiJson: unknown = null;
  let pageHtml = "";
  let debug = "";

  // 1. Try the address-search endpoint
  const lookupRes = await fetchWithTimeout(
    `${NBN_ADDRESS_LOOKUP}?query=${encodeURIComponent(cleanAddr)}`,
  );
  if (lookupRes?.ok) {
    apiJson = await lookupRes.json().catch(() => null);
    debug += `addr-search:${lookupRes.status};`;
    // 2. If lookup returned a loc id, try outage-info
    const locId =
      (apiJson as { results?: Array<{ id?: string; locId?: string }> })
        ?.results?.[0]?.id ||
      (apiJson as { results?: Array<{ id?: string; locId?: string }> })
        ?.results?.[0]?.locId;
    if (locId) {
      const outageRes = await fetchWithTimeout(
        `${NBN_OUTAGE_INFO}?locId=${encodeURIComponent(locId)}`,
      );
      if (outageRes?.ok) {
        const outageJson = await outageRes.json().catch(() => null);
        if (outageJson) apiJson = { lookup: apiJson, outage: outageJson };
        debug += `outage-info:${outageRes.status};`;
      }
    }
  } else if (lookupRes) {
    debug += `addr-search:${lookupRes.status};`;
  } else {
    debug += `addr-search:fetch-failed;`;
  }

  // 3. Always grab the public status page HTML — it lists active incidents
  const pageRes = await fetchWithTimeout(NBN_STATUS_PAGE);
  if (pageRes?.ok) {
    pageHtml = await pageRes.text();
    debug += `status-page:${pageRes.status}(${pageHtml.length}b);`;
  } else {
    debug += `status-page:${pageRes ? pageRes.status : "fetch-failed"};`;
  }

  if (!pageHtml && !apiJson) {
    return {
      hasOutage: false,
      summary: "NBN status service is unreachable; cannot confirm outage.",
      source: "unreachable",
      checkedAt,
      debug,
    };
  }

  const extracted = await extractWithLLM({
    address: cleanAddr,
    pageHtml,
    apiJson,
  });

  return {
    ...extracted,
    source: apiJson ? "nbn-api+page" : "nbn-page",
    checkedAt,
    debug,
  };
}
