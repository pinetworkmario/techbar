/**
 * Network auto-discovery for unmanaged peripherals on a site's LAN.
 *
 * Real implementation comes from the site router's ARP / mDNS / SSDP / LLDP
 * scan + the Ruijie client list + an OUI-to-vendor lookup (see
 * lib/discovery-server.ts). For prototype we synthesise a deterministic,
 * plausible list per (site, category) so every site detail page has data,
 * even when the Ruijie API returns no Wi-Fi clients in that category.
 *
 * Pure JS — no fs / no server-only — safe to call from client components
 * or the synthetic-fallback path on the server.
 */

export type DiscoveryCategory = "voice" | "cctv" | "pos";

export interface DiscoveredDevice {
  id: string;
  category: DiscoveryCategory;
  kind: string;
  vendor: string;
  model: string;
  ip: string;
  mac: string;
  pingMs: number;
  hostname?: string;
}

interface Proto {
  kind: string;
  vendor: string;
  model: string;
  /** First 6 hex chars of MAC (vendor OUI). */
  oui: string;
  hostnameTemplate?: string;
}

// =================== Voice ===================
const VOICE_POOL: Proto[] = [
  { kind: "ATA", vendor: "Grandstream", model: "HT812", oui: "000B82" },
  { kind: "ATA", vendor: "Cisco", model: "SPA112", oui: "001D45" },
  { kind: "IP Phone", vendor: "Yealink", model: "T46U", oui: "001565" },
  { kind: "IP Phone", vendor: "Yealink", model: "T54W", oui: "001565" },
  { kind: "IP Phone", vendor: "Yealink", model: "T31G", oui: "001565" },
  { kind: "IP Phone", vendor: "Cisco", model: "8841", oui: "002414" },
  { kind: "IP Phone", vendor: "Polycom", model: "VVX450", oui: "0004F2" },
  { kind: "DECT base", vendor: "Yealink", model: "W90B", oui: "001565" },
  { kind: "Conference phone", vendor: "Polycom", model: "Trio 8500", oui: "0004F2" },
];

// =================== CCTV ===================
const CCTV_NVR_POOL: Proto[] = [
  { kind: "NVR", vendor: "Hikvision", model: "DS-7616NXI-K2/16P", oui: "BCAD28", hostnameTemplate: "NVR-${n}" },
  { kind: "NVR", vendor: "Hikvision", model: "DS-7732NXI-K4/16P", oui: "BCAD28" },
  { kind: "NVR", vendor: "Dahua", model: "NVR4216-EI", oui: "3C7F7C" },
  { kind: "NVR", vendor: "Dahua", model: "NVR5216-16P-EI", oui: "3C7F7C" },
];
const CCTV_CAMERA_POOL: Proto[] = [
  { kind: "IP Camera", vendor: "Hikvision", model: "DS-2CD2143G2-I", oui: "BCAD28" },
  { kind: "IP Camera", vendor: "Hikvision", model: "DS-2CD2386G2-I", oui: "BCAD28" },
  { kind: "IP Camera", vendor: "Hikvision", model: "DS-2DE4A425IW", oui: "BCAD28" },
  { kind: "IP Camera", vendor: "Dahua", model: "IPC-HFW3849T1-AS", oui: "3C7F7C" },
  { kind: "IP Camera", vendor: "Dahua", model: "IPC-HDW3849T1-AS", oui: "3C7F7C" },
  { kind: "IP Camera", vendor: "Dahua", model: "IPC-HDBW5442R-S", oui: "3C7F7C" },
  { kind: "IP Camera", vendor: "Axis", model: "P3245-LV", oui: "00408C" },
  { kind: "IP Camera", vendor: "Hanwha (Samsung Techwin)", model: "PNV-A9081R", oui: "F08068" },
];
const CCTV_ALARM_POOL: Proto[] = [
  { kind: "Alarm panel", vendor: "Bosch", model: "Solution 6000", oui: "001CCC" },
  { kind: "Alarm panel", vendor: "Honeywell", model: "Vista 21iP", oui: "00D02D" },
  { kind: "Alarm panel", vendor: "DSC", model: "PowerSeries Neo HS2128", oui: "001CCC" },
  { kind: "Alarm panel", vendor: "Paradox", model: "MG6250", oui: "003E1A" },
];

// =================== POS ===================
const POS_PRINTER_POOL: Proto[] = [
  { kind: "Receipt printer", vendor: "Epson", model: "TM-m30III", oui: "44D884" },
  { kind: "Receipt printer", vendor: "Epson", model: "TM-T88VII", oui: "44D884" },
  { kind: "Receipt printer", vendor: "Star Micronics", model: "TSP143IIILAN", oui: "0011BA" },
  { kind: "Receipt printer", vendor: "Bixolon", model: "SRP-330II", oui: "0008E0" },
];
const POS_REGISTER_POOL: Proto[] = [
  { kind: "POS register", vendor: "Lightspeed", model: "Pro register (Windows)", oui: "BCAEC5" },
  { kind: "POS register", vendor: "Square", model: "Stand", oui: "F0F61C" },
  { kind: "POS register", vendor: "Sunmi", model: "V2s Pro", oui: "047F0E" },
];
const POS_DISPLAY_POOL: Proto[] = [
  { kind: "Customer display", vendor: "Lightspeed", model: "CDS-15", oui: "BCAEC5" },
  { kind: "Kitchen display", vendor: "Lightspeed", model: "KDS-21", oui: "BCAEC5" },
];
const POS_EFTPOS_POOL: Proto[] = [
  { kind: "EFTPOS terminal", vendor: "Tyro", model: "Eftpos Plus", oui: "002491" },
  { kind: "EFTPOS terminal", vendor: "Verifone", model: "VX 820", oui: "008087" },
  { kind: "EFTPOS terminal", vendor: "Ingenico", model: "Move/2500", oui: "0001D7" },
];
const POS_SERVER_POOL: Proto[] = [
  { kind: "Local POS server", vendor: "Intel", model: "NUC NUC11PAQi5", oui: "1C697A" },
  { kind: "Local POS server", vendor: "Lenovo", model: "ThinkCentre M70q", oui: "1C697A" },
];

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function macFromOui(oui: string, seed: number): string {
  const trail = (seed * 2654435761).toString(16).padStart(8, "0").slice(-6).toUpperCase();
  const all = oui.toUpperCase().padEnd(6, "0").slice(0, 6) + trail;
  return all.match(/.{1,2}/g)!.join(":");
}

function siteSubnet(siteId: string, override?: string): string {
  if (override) return override;
  const h = hashStr(siteId);
  const octet = 1 + (h % 253);
  return `192.168.${octet}`;
}

interface BuildOpts {
  siteId: string;
  category: DiscoveryCategory;
  proto: Proto;
  seed: number;
  hostOctet: number;
  pingMs: number;
  subnetOverride?: string;
}

function buildDevice(o: BuildOpts): DiscoveredDevice {
  const subnet = siteSubnet(o.siteId, o.subnetOverride);
  const id = `disc-${o.siteId}-${o.category}-${o.proto.kind}-${o.seed}`;
  let hostname: string | undefined;
  if (o.proto.hostnameTemplate) {
    hostname = o.proto.hostnameTemplate.replace(
      "${n}",
      String(1 + (o.seed % 9)).padStart(2, "0"),
    );
  }
  return {
    id,
    category: o.category,
    kind: o.proto.kind,
    vendor: o.proto.vendor,
    model: o.proto.model,
    ip: `${subnet}.${o.hostOctet}`,
    mac: macFromOui(o.proto.oui, o.seed),
    pingMs: o.pingMs,
    hostname,
  };
}

function pickFrom(pool: Proto[], seed: number): Proto {
  return pool[seed % pool.length];
}

function pickN(pool: Proto[], siteId: string, category: string, n: number, used: Set<number>): Proto[] {
  const out: Proto[] = [];
  for (let i = 0; i < n; i++) {
    let attempt = 0;
    let idx: number;
    do {
      idx = hashStr(`${siteId}:${category}:pick:${i}:${attempt}`) % pool.length;
      attempt += 1;
    } while (used.has(idx) && attempt < 6);
    used.add(idx);
    out.push(pool[idx]);
  }
  return out;
}

function nextHost(
  usedHosts: Set<number>,
  seed: number,
  range?: { min: number; max: number },
): number {
  // Default: 50..240 if no DHCP scope known
  const min = range ? Math.max(2, range.min) : 50;
  const max = range ? Math.min(254, range.max) : 240;
  const span = Math.max(1, max - min + 1);
  let host = min + ((seed >> 3) % span);
  let guard = 0;
  while (usedHosts.has(host) && guard < 250) {
    host = min + ((host + 7 - min) % span);
    guard += 1;
  }
  usedHosts.add(host);
  return host;
}

function discoverVoice(siteId: string, subnet?: string, hostRange?: { min: number; max: number }): DiscoveredDevice[] {
  const seed = hashStr(siteId + ":voice");
  const count = 1 + (seed % 3);
  const used = new Set<number>();
  const usedHosts = new Set<number>();
  const protos = pickN(VOICE_POOL, siteId, "voice", count, used);
  return protos.map((p, i) => {
    const s = hashStr(`${siteId}:voice:${i}`);
    return buildDevice({
      siteId,
      category: "voice",
      proto: p,
      seed: s,
      hostOctet: nextHost(usedHosts, s, hostRange),
      pingMs: 2 + (s % 9),
      subnetOverride: subnet,
    });
  });
}

function discoverCctv(siteId: string, subnet?: string, hostRange?: { min: number; max: number }): DiscoveredDevice[] {
  // Always: 1 NVR + 2-4 cameras (Hikvision/Dahua dominant). Sometimes 1 alarm panel.
  const used = new Set<number>();
  const usedHosts = new Set<number>();
  const out: DiscoveredDevice[] = [];

  // NVR (always 1)
  const nvrProto = pickFrom(
    CCTV_NVR_POOL,
    hashStr(`${siteId}:cctv:nvr`),
  );
  const nvrSeed = hashStr(`${siteId}:cctv:nvr`);
  out.push(
    buildDevice({
      siteId,
      category: "cctv",
      proto: nvrProto,
      seed: nvrSeed,
      hostOctet: nextHost(usedHosts, nvrSeed, hostRange),
      pingMs: 1 + (nvrSeed % 4),
      subnetOverride: subnet,
    }),
  );

  // Cameras (2-4)
  const seed = hashStr(`${siteId}:cctv`);
  const camCount = 2 + (seed % 3);
  const camProtos = pickN(CCTV_CAMERA_POOL, siteId, "cctv:cam", camCount, used);
  camProtos.forEach((p, i) => {
    const s = hashStr(`${siteId}:cctv:cam:${i}`);
    out.push(
      buildDevice({
        siteId,
        category: "cctv",
        proto: p,
        seed: s,
        hostOctet: nextHost(usedHosts, s, hostRange),
        pingMs: 2 + (s % 8),
        subnetOverride: subnet,
      }),
    );
  });

  // Alarm panel (~67% of sites)
  if (seed % 3 !== 0) {
    const alarmSeed = hashStr(`${siteId}:cctv:alarm`);
    const alarmProto = pickFrom(CCTV_ALARM_POOL, alarmSeed);
    out.push(
      buildDevice({
        siteId,
        category: "cctv",
        proto: alarmProto,
        seed: alarmSeed,
        hostOctet: nextHost(usedHosts, alarmSeed, hostRange),
        pingMs: 3 + (alarmSeed % 6),
        subnetOverride: subnet,
      }),
    );
  }
  return out;
}

function discoverPos(siteId: string, subnet?: string, hostRange?: { min: number; max: number }): DiscoveredDevice[] {
  // Always: 1-2 receipt printers + 1-2 registers.
  // Often: 1 EFTPOS terminal, 1 customer display, occasionally KDS, server.
  const usedHosts = new Set<number>();
  const out: DiscoveredDevice[] = [];
  const seed = hashStr(`${siteId}:pos`);

  // Printers (1-2)
  const usedPrinter = new Set<number>();
  const printerCount = 1 + (seed % 2);
  pickN(POS_PRINTER_POOL, siteId, "pos:printer", printerCount, usedPrinter).forEach(
    (p, i) => {
      const s = hashStr(`${siteId}:pos:printer:${i}`);
      out.push(
        buildDevice({
          siteId,
          category: "pos",
          proto: p,
          seed: s,
          hostOctet: nextHost(usedHosts, s, hostRange),
          pingMs: 2 + (s % 6),
          subnetOverride: subnet,
        }),
      );
    },
  );

  // Registers (1-2)
  const usedReg = new Set<number>();
  const regCount = 1 + ((seed >> 2) % 2);
  pickN(POS_REGISTER_POOL, siteId, "pos:reg", regCount, usedReg).forEach((p, i) => {
    const s = hashStr(`${siteId}:pos:reg:${i}`);
    out.push(
      buildDevice({
        siteId,
        category: "pos",
        proto: p,
        seed: s,
        hostOctet: nextHost(usedHosts, s, hostRange),
        pingMs: 2 + (s % 7),
        subnetOverride: subnet,
      }),
    );
  });

  // EFTPOS (~75%)
  if ((seed >> 4) % 4 !== 0) {
    const s = hashStr(`${siteId}:pos:eftpos`);
    out.push(
      buildDevice({
        siteId,
        category: "pos",
        proto: pickFrom(POS_EFTPOS_POOL, s),
        seed: s,
        hostOctet: nextHost(usedHosts, s, hostRange),
        pingMs: 3 + (s % 8),
        subnetOverride: subnet,
      }),
    );
  }

  // Customer display (~50%)
  if ((seed >> 6) % 2 !== 0) {
    const s = hashStr(`${siteId}:pos:cds`);
    out.push(
      buildDevice({
        siteId,
        category: "pos",
        proto: POS_DISPLAY_POOL[0],
        seed: s,
        hostOctet: nextHost(usedHosts, s, hostRange),
        pingMs: 2 + (s % 5),
        subnetOverride: subnet,
      }),
    );
  }

  // Kitchen display (~25%)
  if ((seed >> 8) % 4 === 0) {
    const s = hashStr(`${siteId}:pos:kds`);
    out.push(
      buildDevice({
        siteId,
        category: "pos",
        proto: POS_DISPLAY_POOL[1],
        seed: s,
        hostOctet: nextHost(usedHosts, s, hostRange),
        pingMs: 2 + (s % 5),
        subnetOverride: subnet,
      }),
    );
  }

  // Local server (~33%)
  if ((seed >> 10) % 3 === 0) {
    const s = hashStr(`${siteId}:pos:srv`);
    out.push(
      buildDevice({
        siteId,
        category: "pos",
        proto: pickFrom(POS_SERVER_POOL, s),
        seed: s,
        hostOctet: nextHost(usedHosts, s, hostRange),
        pingMs: 1 + (s % 4),
        subnetOverride: subnet,
      }),
    );
  }

  return out;
}

export interface DiscoveryOptions {
  excludeMacs?: ReadonlySet<string>;
  /** "192.168.99" — pass when caller knows the site's real LAN /24. */
  subnet?: string;
  /** DHCP host-octet range (last octet). Constrains synthetic IPs. */
  hostRange?: { min: number; max: number };
}

/**
 * Synthetic discovery for a (site, category). Caller may pass `excludeMacs`
 * to filter out devices already adopted into managed inventory, `subnet`
 * to use the site's real LAN /24, and `hostRange` (last-octet range) to
 * constrain IPs to the actual DHCP pool.
 */
export function discoverDevices(
  siteId: string,
  category: DiscoveryCategory,
  opts: DiscoveryOptions = {},
): DiscoveredDevice[] {
  const { excludeMacs, subnet, hostRange } = opts;
  let out: DiscoveredDevice[];
  if (category === "voice") out = discoverVoice(siteId, subnet, hostRange);
  else if (category === "cctv") out = discoverCctv(siteId, subnet, hostRange);
  else out = discoverPos(siteId, subnet, hostRange);
  if (excludeMacs && excludeMacs.size > 0) {
    out = out.filter((d) => !excludeMacs.has(d.mac.toUpperCase()));
  }
  return out;
}
