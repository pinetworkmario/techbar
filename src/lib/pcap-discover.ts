import "server-only";
import { spawn } from "child_process";
import { chatComplete } from "./openrouter";
import { lookupOui, normaliseMac, refineKind, type DiscoveryHint } from "./oui";

const DISCOVER_MODEL =
  process.env.OPENROUTER_PCAP_MODEL || "qwen/qwen3.6-plus";

export type DeviceCategory =
  | "network_gear"
  | "voice"
  | "cctv"
  | "alarm"
  | "pos"
  | "endpoint"
  | "server"
  | "iot"
  | "unknown";

export interface DiscoveredDevice {
  mac: string;
  ip?: string;
  hostname?: string;
  vendor?: string;
  ouiHint?: DiscoveryHint;
  guessedKind?: string;
  evidence: {
    dhcpVendorClass?: string;
    mdnsServices?: string[];
    httpUserAgents?: string[];
    tlsSnis?: string[];
    topPorts?: number[];
  };
  classification: DeviceCategory;
  classificationSource: "oui" | "llm" | "rule";
  confidence: "high" | "medium" | "low";
  rationale: string;
}

export interface DiscoveryResult {
  devices: DiscoveredDevice[];
  hostsCount: number;
  llmRefinedCount: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
}

function runTshark(filePath: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    const p = spawn("tshark", ["-r", filePath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    p.stdout.on("data", (b) => (out += b.toString()));
    const killer = setTimeout(() => {
      p.kill("SIGKILL");
      resolve(out);
    }, 60_000);
    p.on("close", () => {
      clearTimeout(killer);
      resolve(out);
    });
  });
}

async function tsharkFields(
  file: string,
  filter: string,
  fields: string[],
): Promise<string[][]> {
  const args = [
    "-Y",
    filter,
    "-T",
    "fields",
    "-E",
    "separator=\\t",
    ...fields.flatMap((f) => ["-e", f]),
  ];
  const out = await runTshark(file, args);
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split("\t"));
}

interface HostRecord {
  mac?: string;
  ip?: string;
  hostname?: string;
  dhcpVendorClass?: string;
  mdnsServices: Set<string>;
  httpUserAgents: Set<string>;
  tlsSnis: Set<string>;
  ports: Map<number, number>; // port → packet count
}

function getOrCreateByMac(
  byMac: Map<string, HostRecord>,
  mac: string,
): HostRecord {
  const key = mac.toUpperCase();
  let h = byMac.get(key);
  if (!h) {
    h = {
      mac: key,
      mdnsServices: new Set(),
      httpUserAgents: new Set(),
      tlsSnis: new Set(),
      ports: new Map(),
    };
    byMac.set(key, h);
  }
  return h;
}

/** Heuristic post-OUI classification. Used as a quick win when OUI gives a
 * hint but vendor isn't enough to map to a portal category. */
function ruleClassify(
  rec: HostRecord,
  ouiHint?: DiscoveryHint,
): { cat: DeviceCategory; rationale: string } | null {
  const ports = [...rec.ports.keys()];
  const hostname = (rec.hostname || "").toLowerCase();
  const dhcpClass = (rec.dhcpVendorClass || "").toLowerCase();
  const ua = [...rec.httpUserAgents].join(" ").toLowerCase();
  const mdns = [...rec.mdnsServices].join(" ").toLowerCase();
  const sni = [...rec.tlsSnis].join(" ").toLowerCase();
  const all = `${hostname} ${dhcpClass} ${ua} ${mdns} ${sni}`;

  if (ouiHint === "voice") return { cat: "voice", rationale: "OUI is a known voice vendor" };
  if (ouiHint === "cctv") {
    if (/alarm|panel|ajax|bosch/.test(all))
      return { cat: "alarm", rationale: "CCTV-vendor MAC + alarm hint in traffic" };
    return { cat: "cctv", rationale: "OUI is a known CCTV vendor" };
  }
  if (ouiHint === "pos") return { cat: "pos", rationale: "OUI is a known POS vendor" };
  if (ouiHint === "infrastructure")
    return { cat: "network_gear", rationale: "OUI is a known network-gear vendor" };

  if (ports.includes(5060) || ports.includes(5061) || /\bsip\b/.test(all))
    return { cat: "voice", rationale: "Speaks SIP / port 5060" };
  if (ports.includes(554) || /rtsp|onvif/.test(all))
    return { cat: "cctv", rationale: "Speaks RTSP / ONVIF" };
  if (/sunmi|abacus|pisell|square|tyro|eftpos|register/.test(all))
    return { cat: "pos", rationale: "POS-vendor signature in hostname/UA/SNI" };
  if (/airos|edgemax|unifi|ruijie|tplink-omada/.test(all))
    return { cat: "network_gear", rationale: "Network-gear signature" };
  if (/_workstation|laptop|desktop|surface|macbook|imac/.test(all))
    return { cat: "endpoint", rationale: "Workstation hostname pattern" };
  if (/_googlecast|_airplay|_spotify-connect/.test(all))
    return { cat: "iot", rationale: "Streaming / consumer IoT mDNS" };

  return null;
}

export async function discoverDevices(opts: {
  filePath: string;
  siteName: string;
  lanSubnet?: string;
}): Promise<DiscoveryResult> {
  // Pull the raw signals in parallel.
  const [arp, dhcp, mdnsRows, uaRows, sniRows, convTcp] = await Promise.all([
    tsharkFields(opts.filePath, "arp.opcode==2", [
      "arp.src.hw_mac",
      "arp.src.proto_ipv4",
    ]),
    tsharkFields(opts.filePath, "bootp.option.dhcp", [
      "bootp.hw.mac_addr",
      "bootp.option.hostname",
      "bootp.option.vendor_class_id",
      "bootp.option.requested_ip_address",
    ]),
    tsharkFields(opts.filePath, "mdns", ["ip.src", "dns.qry.name"]),
    tsharkFields(opts.filePath, "http.user_agent", [
      "ip.src",
      "http.user_agent",
    ]),
    tsharkFields(opts.filePath, "tls.handshake.type==1", [
      "ip.src",
      "tls.handshake.extensions_server_name",
    ]),
    runTshark(opts.filePath, ["-q", "-z", "endpoints,tcp"]),
  ]);

  const byMac = new Map<string, HostRecord>();
  const ipToMac = new Map<string, string>();

  // ARP — primary MAC↔IP mapping
  for (const [mac, ip] of arp) {
    if (!mac || !ip) continue;
    const h = getOrCreateByMac(byMac, mac);
    h.ip = ip;
    ipToMac.set(ip, mac.toUpperCase());
  }

  // DHCP — fills hostname + vendor class + may add hosts not seen in ARP
  for (const row of dhcp) {
    const [mac, hostname, vc, reqIp] = row;
    if (!mac) continue;
    const h = getOrCreateByMac(byMac, mac);
    if (hostname && !h.hostname) h.hostname = hostname;
    if (vc && !h.dhcpVendorClass) h.dhcpVendorClass = vc;
    if (reqIp && !h.ip) {
      h.ip = reqIp;
      ipToMac.set(reqIp, mac.toUpperCase());
    }
  }

  function recForIp(ip: string): HostRecord | null {
    const mac = ipToMac.get(ip);
    if (!mac) return null;
    return byMac.get(mac) ?? null;
  }

  for (const [ip, qname] of mdnsRows) {
    const h = recForIp(ip);
    if (h && qname) h.mdnsServices.add(qname);
  }
  for (const [ip, ua] of uaRows) {
    const h = recForIp(ip);
    if (h && ua) h.httpUserAgents.add(ua.slice(0, 200));
  }
  for (const [ip, sni] of sniRows) {
    const h = recForIp(ip);
    if (h && sni) h.tlsSnis.add(sni);
  }

  // Parse `endpoints,tcp` for top destination ports per IP. The output is a
  // ragged ASCII table; just look for "<ip>:<port>" tokens and aggregate.
  const portRe = /(\d+\.\d+\.\d+\.\d+):(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = portRe.exec(convTcp)) !== null) {
    const ip = m[1];
    const port = Number(m[2]);
    const h = recForIp(ip);
    if (h) h.ports.set(port, (h.ports.get(port) ?? 0) + 1);
  }

  const devices: DiscoveredDevice[] = [];
  const needsLlm: DiscoveredDevice[] = [];

  for (const rec of byMac.values()) {
    if (!rec.mac) continue;
    const oui = lookupOui(rec.mac);
    const vendor = oui?.vendor;
    const guessedKind = oui ? refineKind(oui, rec.hostname) : undefined;
    const topPorts = [...rec.ports.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([p]) => p);

    const evidence = {
      dhcpVendorClass: rec.dhcpVendorClass,
      mdnsServices: [...rec.mdnsServices].slice(0, 8),
      httpUserAgents: [...rec.httpUserAgents].slice(0, 4),
      tlsSnis: [...rec.tlsSnis].slice(0, 8),
      topPorts,
    };

    const ruleHit = ruleClassify(rec, oui?.hint);
    let device: DiscoveredDevice;
    if (ruleHit) {
      device = {
        mac: normaliseMac(rec.mac),
        ip: rec.ip,
        hostname: rec.hostname,
        vendor,
        ouiHint: oui?.hint,
        guessedKind,
        evidence,
        classification: ruleHit.cat,
        classificationSource: oui?.hint ? "oui" : "rule",
        confidence: oui?.hint ? "high" : "medium",
        rationale: ruleHit.rationale,
      };
      devices.push(device);
    } else {
      device = {
        mac: normaliseMac(rec.mac),
        ip: rec.ip,
        hostname: rec.hostname,
        vendor,
        ouiHint: oui?.hint,
        guessedKind,
        evidence,
        classification: "unknown",
        classificationSource: "llm",
        confidence: "low",
        rationale: "(awaiting LLM)",
      };
      devices.push(device);
      needsLlm.push(device);
    }
  }

  let usage: DiscoveryResult["usage"];
  let model: string | undefined;

  if (needsLlm.length > 0) {
    const compact = needsLlm.map((d, i) => ({
      idx: i,
      mac: d.mac,
      ip: d.ip,
      hostname: d.hostname,
      vendor: d.vendor,
      dhcpVendorClass: d.evidence.dhcpVendorClass,
      mdns: d.evidence.mdnsServices,
      ua: d.evidence.httpUserAgents,
      sni: d.evidence.tlsSnis,
      topPorts: d.evidence.topPorts,
    }));

    const sys = `You classify network hosts by their traffic fingerprint. Each input host has a MAC vendor (if known), DHCP hostname/vendor-class, mDNS services advertised, HTTP user agents, TLS SNIs, and top TCP destination ports.

Categories — pick exactly one per host:
- network_gear: routers, switches, APs, firewalls
- voice: IP phones, ATAs, SIP gateways
- cctv: NVRs, IP cameras
- alarm: alarm panels (Ajax, Bosch, Hik alarm series, etc.)
- pos: POS terminals, EFTPOS, kitchen displays
- endpoint: workstations, laptops (incl. mac/win/linux)
- server: on-prem servers (NAS, ESXi, file/print)
- iot: smart TVs, casting, smart plugs, etc.
- unknown: not enough signal

Return STRICT JSON: {"results":[{"idx":0,"category":"...","confidence":"high|medium|low","rationale":"one short sentence"}]}.
Do not add any text outside the JSON.`;

    const user = `Site: ${opts.siteName}${opts.lanSubnet ? ` (LAN ${opts.lanSubnet}.0/24)` : ""}\n\nHosts:\n${JSON.stringify(compact, null, 2)}`;

    try {
      const r = await chatComplete(
        [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        { model: DISCOVER_MODEL, maxTokens: 2500, temperature: 0.1 },
      );
      usage = r.usage;
      model = r.model;
      const jsonMatch = r.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          results?: Array<{
            idx: number;
            category: string;
            confidence?: string;
            rationale?: string;
          }>;
        };
        for (const result of parsed.results || []) {
          const target = needsLlm[result.idx];
          if (!target) continue;
          target.classification =
            (result.category as DeviceCategory) || "unknown";
          target.confidence =
            (result.confidence as "high" | "medium" | "low") || "low";
          target.rationale = result.rationale || "";
        }
      }
    } catch (e) {
      for (const d of needsLlm) {
        d.rationale = `(LLM classification failed: ${String(e).slice(0, 80)})`;
      }
    }
  }

  // Sort: network_gear first, then by category, then by IP
  const order: DeviceCategory[] = [
    "network_gear",
    "voice",
    "cctv",
    "alarm",
    "pos",
    "endpoint",
    "server",
    "iot",
    "unknown",
  ];
  devices.sort((a, b) => {
    const oa = order.indexOf(a.classification);
    const ob = order.indexOf(b.classification);
    if (oa !== ob) return oa - ob;
    return (a.ip || "").localeCompare(b.ip || "");
  });

  return {
    devices,
    hostsCount: byMac.size,
    llmRefinedCount: needsLlm.length,
    usage,
    model,
  };
}
