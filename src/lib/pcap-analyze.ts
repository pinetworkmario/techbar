import "server-only";
import { spawn } from "child_process";
import { chatComplete } from "./openrouter";

const PCAP_MODEL =
  process.env.OPENROUTER_PCAP_MODEL || "anthropic/claude-sonnet-4.5";

function runTshark(filePath: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    const p = spawn("tshark", ["-r", filePath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    p.stdout.on("data", (b) => (out += b.toString()));
    p.stderr.on("data", (b) => (err += b.toString()));
    const killer = setTimeout(() => {
      p.kill("SIGKILL");
      resolve(out + "\n[truncated: tshark timed out]");
    }, 60_000);
    p.on("close", () => {
      clearTimeout(killer);
      // tshark prints harmless warnings to stderr; only attach if it
      // actually failed to produce output.
      if (!out && err) resolve(`(tshark error)\n${err.slice(0, 1000)}`);
      else resolve(out);
    });
  });
}

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n…[truncated, ${s.length - max} more chars]`;
}

export interface PcapAnalysisInput {
  filePath: string;
  siteName: string;
  siteAddress?: string;
  accessNetwork?: string;
  lanSubnet?: string;
}

export interface PcapAnalysisResult {
  /** Markdown report from the LLM. */
  report: string;
  /** Short structured stats extracted from tshark, surfaced separately
   * for the UI. */
  stats: {
    capInfo: string;
    protocolHierarchy: string;
    topConversations: string;
    expert: string;
    dnsErrors: string;
  };
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
}

export async function analyzePcap(
  input: PcapAnalysisInput,
): Promise<PcapAnalysisResult> {
  // Pull a handful of summary statistics. Each is small (~few KB) so we can
  // safely concatenate them as the LLM prompt context.
  const [capInfo, phs, conv, expert, dns] = await Promise.all([
    runTshark(input.filePath, ["-q", "-z", "io,stat,0"]),
    runTshark(input.filePath, ["-q", "-z", "io,phs"]),
    runTshark(input.filePath, ["-q", "-z", "conv,ip"]),
    runTshark(input.filePath, ["-q", "-z", "expert"]),
    runTshark(input.filePath, [
      "-q",
      "-z",
      "dns,tree",
      "-Y",
      "dns.flags.rcode != 0",
    ]),
  ]);

  const stats = {
    capInfo: clip(capInfo, 1500),
    protocolHierarchy: clip(phs, 4000),
    topConversations: clip(conv, 6000),
    expert: clip(expert, 4000),
    dnsErrors: clip(dns, 3000),
  };

  const systemPrompt = `You are a senior network engineer analyzing a packet capture taken at a customer's on-prem router. Your job is to identify likely problems and surface them in plain language for the on-call technician.

Focus on:
- Connectivity issues (high retransmission %, RST/FIN floods, asymmetric flows)
- DNS failures or slow resolutions
- Suspicious destinations (unexpected high-volume external IPs, malware-like patterns)
- Protocol anomalies (unusual TCP flags, fragmented IP, ARP storms)
- Possible bottlenecks (single host saturating uplink, broadcast storms)
- Plain-text credentials, unencrypted protocols where they shouldn't be

Format the response as Markdown with these sections (only include a section if you have something concrete to say):
1. **Top-line verdict** (one sentence)
2. **Findings** (bullets, each with what you saw and why it matters)
3. **Recommended actions** (concrete next steps for the technician)
4. **Notes / unknowns** (anything you'd need extra data to confirm)

Be calibrated: if traffic looks healthy, say so. Don't manufacture problems. If a finding could be benign, mark it as such.`;

  const userPrompt = `Site: ${input.siteName}${input.siteAddress ? ` (${input.siteAddress})` : ""}
Access network: ${input.accessNetwork ?? "unknown"}
LAN: ${input.lanSubnet ?? "unknown"}

== tshark capture stats (io,stat,0) ==
${stats.capInfo}

== Protocol hierarchy (io,phs) ==
${stats.protocolHierarchy}

== Top IP conversations (conv,ip) ==
${stats.topConversations}

== Expert info (warnings/errors) ==
${stats.expert}

== DNS responses with non-zero rcode ==
${stats.dnsErrors || "(none)"}
`;

  const { text, usage, model } = await chatComplete(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { model: PCAP_MODEL, maxTokens: 1800, temperature: 0.2 },
  );

  return { report: text, stats, usage, model };
}
