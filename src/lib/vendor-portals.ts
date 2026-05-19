import type {
  Site,
  NetworkVendor,
  CameraVendor,
  AlarmVendor,
  PosVendor,
} from "@/lib/types";

export interface VendorLink {
  label: string;
  url: string;
  /** Hint that the user will need credentials from Vaultwarden to log in. */
  needsCreds?: boolean;
  /** Optional sub-text shown under the label. */
  hint?: string;
}

const NETWORK_PORTALS: Record<NetworkVendor, (id: string) => VendorLink[]> = {
  ruijie: (id) => [
    {
      label: "Ruijie Cloud",
      url: "https://noc.ruijienetworks.com/",
      hint: `Group: ${id}`,
      needsCreds: true,
    },
  ],
  ubiquiti: (id) => [
    {
      label: "UniFi Site Manager",
      url: "https://unifi.ui.com/",
      hint: `Site: ${id}`,
      needsCreds: true,
    },
  ],
  tplink: (id) => [
    {
      label: "TP-Link Omada Cloud",
      url: "https://omada.tplinkcloud.com/",
      hint: `Site: ${id}`,
      needsCreds: true,
    },
  ],
};

const CAMERA_PORTALS: Record<CameraVendor, (ip?: string) => VendorLink[]> = {
  hikvision: (ip) =>
    ip
      ? [{ label: "Hikvision NVR (HTTP)", url: `http://${ip}/`, needsCreds: true }]
      : [{ label: "Hik-Connect", url: "https://www.hik-connect.com/", needsCreds: true }],
  dahua: (ip) =>
    ip
      ? [{ label: "Dahua NVR (HTTP)", url: `http://${ip}/`, needsCreds: true }]
      : [{ label: "DMSS / Dahua Cloud", url: "https://www.dahuasecurity.com/", needsCreds: true }],
  tplink: (ip) =>
    ip
      ? [{ label: "TP-Link VIGI (HTTP)", url: `http://${ip}/`, needsCreds: true }]
      : [{ label: "TP-Link VIGI Cloud", url: "https://vigi.tplinkcloud.com/", needsCreds: true }],
  other: (ip) => (ip ? [{ label: `Camera mgmt (${ip})`, url: `http://${ip}/`, needsCreds: true }] : []),
};

const ALARM_PORTALS: Record<AlarmVendor, (ip?: string) => VendorLink[]> = {
  hikvision: (ip) => (ip ? [{ label: "Hikvision Alarm", url: `http://${ip}/`, needsCreds: true }] : []),
  dahua: (ip) => (ip ? [{ label: "Dahua Alarm", url: `http://${ip}/`, needsCreds: true }] : []),
  ajax: () => [{ label: "Ajax PRO Desktop", url: "https://pro.ajax.systems/", needsCreds: true }],
  bosch: (ip) => (ip ? [{ label: "Bosch Panel", url: `http://${ip}/`, needsCreds: true }] : []),
  other: (ip) => (ip ? [{ label: `Alarm mgmt (${ip})`, url: `http://${ip}/`, needsCreds: true }] : []),
};

const POS_PORTALS: Record<PosVendor, () => VendorLink[]> = {
  Abacus: () => [{ label: "Abacus Cloud", url: "https://www.abacus.com.au/", needsCreds: true }],
  Pisell: () => [{ label: "Pisell Backoffice", url: "https://www.pisell.com/", needsCreds: true }],
  Square: () => [{ label: "Square Dashboard", url: "https://squareup.com/dashboard/", needsCreds: true }],
};

export function networkLinks(site: Site): VendorLink[] {
  const m = site.networkModule;
  if (!m?.vendor) return [];
  const id = m.siteIdentifier || site.ruijieGroupName || site.name;
  return NETWORK_PORTALS[m.vendor]?.(id) ?? [];
}

export function cctvLinks(site: Site): VendorLink[] {
  const m = site.cctvModule;
  if (!m) return [];
  const out: VendorLink[] = [];
  if (m.cameraVendor) out.push(...(CAMERA_PORTALS[m.cameraVendor]?.(m.cameraIp) ?? []));
  if (m.alarmVendor) out.push(...(ALARM_PORTALS[m.alarmVendor]?.(m.alarmIp) ?? []));
  return out;
}

export function posLinks(site: Site): VendorLink[] {
  const m = site.posModule;
  if (!m?.vendor) return [];
  const out = POS_PORTALS[m.vendor]?.() ?? [];
  if (m.terminalIp) out.push({ label: `Terminal (${m.terminalIp})`, url: `http://${m.terminalIp}/` });
  if (m.managed && m.sunmiSiteName) {
    out.push({
      label: "Sunmi Cloud",
      url: "https://sunmi.com/",
      hint: `Site: ${m.sunmiSiteName}`,
      needsCreds: true,
    });
  }
  return out;
}

export function voiceLinks(site: Site): VendorLink[] {
  const m = site.voiceModule;
  if (!m) return [];
  if (m.mode === "custom_domain" && m.customDomain) {
    return [{ label: "Customer SIP portal", url: `https://${m.customDomain}/`, needsCreds: true }];
  }
  return [{ label: "PI default PBX", url: "https://pbx.pinetwork.com.au/", needsCreds: true }];
}

export function endpointLinks(site: Site): VendorLink[] {
  const m = site.endpointModule;
  if (!m?.ateraCustomerName) return [];
  const customer = encodeURIComponent(m.ateraCustomerName);
  return [
    {
      label: "Atera",
      url: `https://app.atera.com/Admin#/customer/${customer}`,
      hint: `Customer: ${m.ateraCustomerName}`,
      needsCreds: true,
    },
  ];
}

export function vaultwardenSearchUrl(siteName: string): string {
  return `https://172.16.88.88:8222/#/vault?search=${encodeURIComponent(siteName)}`;
}
