import type { AccessNetworkType, OutageReport } from "./types";

export interface AccessTypeMeta {
  key: AccessNetworkType;
  label: string;
  /** Carrier-status source we'd query for outages in production. */
  statusSource: string;
}

export const ACCESS_TYPES: Record<AccessNetworkType, AccessTypeMeta> = {
  NBN_FTTP: { key: "NBN_FTTP", label: "NBN — Fibre to the Premises", statusSource: "NBN Co status API" },
  NBN_FTTC: { key: "NBN_FTTC", label: "NBN — Fibre to the Curb", statusSource: "NBN Co status API" },
  NBN_FTTN: { key: "NBN_FTTN", label: "NBN — Fibre to the Node", statusSource: "NBN Co status API" },
  NBN_HFC:  { key: "NBN_HFC",  label: "NBN — Hybrid Fibre Coaxial", statusSource: "NBN Co status API" },
  NBN_FW:   { key: "NBN_FW",   label: "NBN — Fixed Wireless",     statusSource: "NBN Co status API" },
  NBN_EE:   { key: "NBN_EE",   label: "NBN — Enterprise Ethernet", statusSource: "NBN Co status API" },
  Opticomm: { key: "Opticomm", label: "Opticomm",                 statusSource: "Opticomm portal" },
  Starlink: { key: "Starlink", label: "Starlink",                 statusSource: "Starlink status page" },
  Lightning:{ key: "Lightning", label: "Lightning Broadband",     statusSource: "Lightning Broadband status page" },
  "4G":     { key: "4G",       label: "4G LTE",                   statusSource: "Carrier (Telstra/Optus/Vodafone) status" },
  "5G":     { key: "5G",       label: "5G",                       statusSource: "Carrier (Telstra/Optus/Vodafone) status" },
  Other:    { key: "Other",    label: "Other / unspecified",      statusSource: "Carrier portal" },
};

export function getAccessTypeMeta(t?: AccessNetworkType): AccessTypeMeta {
  return ACCESS_TYPES[t ?? "Other"];
}

/**
 * Synthetic outage check.
 *
 * Real implementation would hit:
 *   - NBN Co's outage / service-status API (requires a registered RSP token)
 *   - Carrier status pages for 4G/5G/Lightning/Opticomm/Starlink
 *
 * For prototype we deterministically simulate: most checks return
 * "operational"; ~5% report a scheduled maintenance window; ~2% an active
 * outage. Stable per (siteId, hour-bucket) so repeated checks within the
 * same hour give the same answer.
 */
export function syntheticOutageCheck(
  siteId: string,
  type: AccessNetworkType | undefined,
  carrier: string | undefined,
): OutageReport {
  const now = new Date();
  const bucket = `${siteId}:${type ?? "?"}:${now.toISOString().slice(0, 13)}`; // yyyy-mm-ddThh
  let h = 5381;
  for (let i = 0; i < bucket.length; i++) h = (h * 33 + bucket.charCodeAt(i)) | 0;
  const r = Math.abs(h) % 100;
  const meta = getAccessTypeMeta(type);
  const source = `${meta.statusSource}${carrier ? ` (${carrier})` : ""}`;
  if (r < 2) {
    return {
      status: "outage",
      checkedAt: now.toISOString(),
      source,
      message: `${meta.label} reports an active outage in your area. Crews dispatched.`,
    };
  }
  if (r < 7) {
    const start = new Date(now.getTime() + (1 + (r % 4)) * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 90 * 60 * 1000);
    return {
      status: "scheduled",
      checkedAt: now.toISOString(),
      source,
      message: `${meta.label}: scheduled maintenance window — possible brief loss of service.`,
      scheduledStartsAt: start.toISOString(),
      scheduledEndsAt: end.toISOString(),
    };
  }
  if (r < 11) {
    return {
      status: "degraded",
      checkedAt: now.toISOString(),
      source,
      message: `${meta.label}: carrier reports degraded throughput in your region. Service is up.`,
    };
  }
  return {
    status: "operational",
    checkedAt: now.toISOString(),
    source,
    message: `${meta.label}: no known incidents in your area.`,
  };
}

