/**
 * Curated IEEE OUI subset for vendor + device-category lookup.
 * Intentionally limited to vendors we surface in voice / cctv / pos / endpoint
 * tabs. For full coverage, swap this lookup for a live IEEE registry (~30 K
 * entries, ~1.5 MB).
 */

export type DiscoveryHint =
  | "voice"
  | "cctv"
  | "pos"
  | "endpoint"
  | "infrastructure"
  | "general";

export interface OuiEntry {
  vendor: string;
  hint: DiscoveryHint;
  typicalKind?: string;
}

// All keys are uppercase, no separators.
const OUI_TABLE: Record<string, OuiEntry> = {
  // ===== Voice =====
  "001565": { vendor: "Yealink", hint: "voice", typicalKind: "IP Phone" },
  "805EC0": { vendor: "Yealink", hint: "voice", typicalKind: "IP Phone" },
  "80383E": { vendor: "Yealink", hint: "voice", typicalKind: "IP Phone" },
  "80B81C": { vendor: "Yealink", hint: "voice", typicalKind: "IP Phone" },
  "0004F2": { vendor: "Polycom", hint: "voice", typicalKind: "IP Phone" },
  "64167F": { vendor: "Polycom", hint: "voice", typicalKind: "IP Phone" },
  "001D45": { vendor: "Cisco", hint: "voice", typicalKind: "IP Phone" },
  "002414": { vendor: "Cisco", hint: "voice", typicalKind: "IP Phone" },
  "080030": { vendor: "Cisco", hint: "voice", typicalKind: "IP Phone" },
  "0017DF": { vendor: "Cisco", hint: "voice", typicalKind: "IP Phone" },
  "000B82": { vendor: "Grandstream", hint: "voice", typicalKind: "ATA" },
  "C074AD": { vendor: "Grandstream", hint: "voice", typicalKind: "IP Phone" },
  "000413": { vendor: "Snom", hint: "voice", typicalKind: "IP Phone" },
  "0008E3": { vendor: "Mitel", hint: "voice", typicalKind: "IP Phone" },
  "0005BC": { vendor: "Patton", hint: "voice", typicalKind: "ATA" },
  "0011AB": { vendor: "Avaya", hint: "voice", typicalKind: "IP Phone" },
  "002491": { vendor: "Tyro", hint: "pos", typicalKind: "EFTPOS terminal" },

  // ===== CCTV / Alarm =====
  BCAD28: { vendor: "Hikvision", hint: "cctv", typicalKind: "IP Camera" },
  "50FA84": { vendor: "Hikvision", hint: "cctv", typicalKind: "IP Camera" },
  "4C8C49": { vendor: "Hikvision", hint: "cctv", typicalKind: "IP Camera" },
  "4868DB": { vendor: "Hikvision", hint: "cctv", typicalKind: "IP Camera" },
  C0568D: { vendor: "Hikvision", hint: "cctv", typicalKind: "IP Camera" },
  "3C7F7C": { vendor: "Dahua", hint: "cctv", typicalKind: "IP Camera" },
  "3CEF8C": { vendor: "Dahua", hint: "cctv", typicalKind: "IP Camera" },
  "4CF4FC": { vendor: "Dahua", hint: "cctv", typicalKind: "IP Camera" },
  "00408C": { vendor: "Axis", hint: "cctv", typicalKind: "IP Camera" },
  ACCC8E: { vendor: "Axis", hint: "cctv", typicalKind: "IP Camera" },
  B8A44F: { vendor: "Axis", hint: "cctv", typicalKind: "IP Camera" },
  F08068: { vendor: "Hanwha (Samsung Techwin)", hint: "cctv", typicalKind: "IP Camera" },
  "001CCC": { vendor: "Bosch", hint: "cctv", typicalKind: "Alarm panel" },
  "0006C8": { vendor: "Bosch", hint: "cctv", typicalKind: "Alarm panel" },
  "00D02D": { vendor: "Honeywell", hint: "cctv", typicalKind: "Alarm panel" },
  "002C1A": { vendor: "Honeywell", hint: "cctv", typicalKind: "Alarm panel" },
  "003E1A": { vendor: "Paradox", hint: "cctv", typicalKind: "Alarm panel" },
  D420B0: { vendor: "Uniview", hint: "cctv", typicalKind: "IP Camera" },
  "000272": { vendor: "Vivotek", hint: "cctv", typicalKind: "IP Camera" },
  "9C8ECD": { vendor: "Lorex", hint: "cctv", typicalKind: "IP Camera" },
  "007FFE": { vendor: "Reolink", hint: "cctv", typicalKind: "IP Camera" },
  EC71DB: { vendor: "Ubiquiti", hint: "cctv", typicalKind: "IP Camera" },

  // ===== POS =====
  "44D884": { vendor: "Epson", hint: "pos", typicalKind: "Receipt printer" },
  "64EB8C": { vendor: "Epson", hint: "pos", typicalKind: "Receipt printer" },
  "80AC9D": { vendor: "Epson", hint: "pos", typicalKind: "Receipt printer" },
  "0026AB": { vendor: "Epson", hint: "pos", typicalKind: "Receipt printer" },
  "0011BA": { vendor: "Star Micronics", hint: "pos", typicalKind: "Receipt printer" },
  "002E07": { vendor: "Star Micronics", hint: "pos", typicalKind: "Receipt printer" },
  "0008E0": { vendor: "Bixolon", hint: "pos", typicalKind: "Receipt printer" },
  "0011A5": { vendor: "Citizen Systems", hint: "pos", typicalKind: "Receipt printer" },
  F0F61C: { vendor: "Square", hint: "pos", typicalKind: "POS register" },
  "80E650": { vendor: "Square", hint: "pos", typicalKind: "POS register" },
  "047F0E": { vendor: "Sunmi", hint: "pos", typicalKind: "POS register" },
  "002D76": { vendor: "Sunmi", hint: "pos", typicalKind: "POS register" },
  "008087": { vendor: "Verifone", hint: "pos", typicalKind: "EFTPOS terminal" },
  "003041": { vendor: "Verifone", hint: "pos", typicalKind: "EFTPOS terminal" },
  "0001D7": { vendor: "Ingenico", hint: "pos", typicalKind: "EFTPOS terminal" },
  "001A30": { vendor: "Ingenico", hint: "pos", typicalKind: "EFTPOS terminal" },

  // ===== Endpoint (compute) =====
  "1C697A": { vendor: "Lenovo", hint: "endpoint", typicalKind: "Windows PC" },
  "00216A": { vendor: "Lenovo", hint: "endpoint", typicalKind: "Windows PC" },
  E04F43: { vendor: "Lenovo", hint: "endpoint", typicalKind: "Windows PC" },
  "002655": { vendor: "HP", hint: "endpoint", typicalKind: "Windows PC" },
  "0050BA": { vendor: "HP", hint: "endpoint", typicalKind: "Windows PC" },
  "008E62": { vendor: "HP", hint: "endpoint", typicalKind: "Windows PC" },
  "5CF9DD": { vendor: "Dell", hint: "endpoint", typicalKind: "Windows PC" },
  B083FE: { vendor: "Dell", hint: "endpoint", typicalKind: "Windows PC" },
  "002564": { vendor: "Dell", hint: "endpoint", typicalKind: "Windows PC" },
  "001451": { vendor: "Apple", hint: "endpoint", typicalKind: "Apple device" },
  "0023DF": { vendor: "Apple", hint: "endpoint", typicalKind: "Apple device" },
  "240A64": { vendor: "Apple", hint: "endpoint", typicalKind: "Apple device" },
  ACCF85: { vendor: "Apple", hint: "endpoint", typicalKind: "Apple device" },
  B0CA68: { vendor: "Apple", hint: "endpoint", typicalKind: "Apple device" },
  F0DBE2: { vendor: "Apple", hint: "endpoint", typicalKind: "Apple device" },
  D8BB2C: { vendor: "Microsoft", hint: "endpoint", typicalKind: "Windows PC" },
  "002354": { vendor: "Microsoft Surface", hint: "endpoint", typicalKind: "Windows PC" },

  // ===== Infrastructure (managed by us, hide from "discovered") =====
  C0B8E6: { vendor: "Ruijie", hint: "infrastructure" },
  "00D0F8": { vendor: "Ruijie", hint: "infrastructure" },
  "001A6B": { vendor: "Ruijie", hint: "infrastructure" },
  "5869C6": { vendor: "Ruijie", hint: "infrastructure" },
  "286ED4": { vendor: "Ruijie", hint: "infrastructure" },
};

export function ouiOf(mac: string): string {
  return mac.replace(/[^a-fA-F0-9]/g, "").slice(0, 6).toUpperCase();
}

export function lookupOui(mac: string): OuiEntry | null {
  const oui = ouiOf(mac);
  return OUI_TABLE[oui] || null;
}

export function normaliseMac(mac: string): string {
  const hex = mac.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (hex.length !== 12) return mac;
  return hex.match(/.{1,2}/g)!.join(":");
}

/**
 * Refine kind based on hostname / SSID / aliasName patterns when the OUI alone
 * isn't enough.
 */
export function refineKind(
  oui: OuiEntry,
  hostnameOrAlias?: string,
): string {
  const base = oui.typicalKind || oui.vendor;
  const h = (hostnameOrAlias || "").toLowerCase();
  if (!h) return base;
  // Generic patterns
  if (/\bnvr\b|\bdvr\b/.test(h)) return "NVR";
  if (/\bcam(era)?\b/.test(h)) return "IP Camera";
  if (/\balarm\b|\bpanel\b/.test(h)) return "Alarm panel";
  if (/\bata\b/.test(h)) return "ATA";
  if (/\bphone\b|handset|extension/.test(h)) return "IP Phone";
  if (/\bdect\b/.test(h)) return "DECT base";
  if (/printer|receipt|tm-/.test(h)) return "Receipt printer";
  if (/\bkds\b|kitchen/.test(h)) return "Kitchen display";
  if (/\bcds\b|customer-?display/.test(h)) return "Customer display";
  if (/eftpos|tyro|terminal/.test(h)) return "EFTPOS terminal";
  if (/register|till|pos[-_]?\d/.test(h)) return "POS register";
  if (/server|nuc/.test(h)) return "Local POS server";
  return base;
}
