import type { SupportPack } from "./types";

export interface SupportPackMeta {
  key: SupportPack;
  name: string;
  blurb: string;
  sla: string;
  scope: string;
  onsite: string;
  materials: string;
  ticketCharge: string;
  /** Tailwind tone for the badge: brand / success / warning / neutral */
  tone: "brand" | "success" | "warning" | "neutral";
}

export const SUPPORT_PACKS: Record<SupportPack, SupportPackMeta> = {
  isp_only: {
    key: "isp_only",
    name: "ISP Support Only",
    blurb:
      "Managed connectivity coverage limited to the internet circuit and any provisioned 4G failover. All other on-premise systems are out of scope.",
    sla: "Business-hours response, best effort. No formal Service Level Agreement outside the ISP scope.",
    scope:
      "Internet circuit, carrier liaison, and 4G failover where provisioned.",
    onsite: "Onsite labour billable at PI Network's standard rates.",
    materials: "Materials and consumables billable at standard rates.",
    ticketCharge:
      "Service requests relating to systems outside the ISP scope (Voice, POS, CCTV, Endpoint, IT) are billable per request.",
    tone: "neutral",
  },
  essential: {
    key: "essential",
    name: "Essential Bundle",
    blurb:
      "Full-coverage managed service across every PI Network-supported system at this site, delivered on a best-effort basis without a contractual response SLA.",
    sla: "Business-hours response, best effort. No formal Service Level Agreement.",
    scope:
      "Network, Voice, POS, CCTV, Endpoint and IT Support across all in-scope devices at this site.",
    onsite:
      "Onsite labour billable at PI Network's discounted Essential customer rate.",
    materials: "Materials and consumables billable at standard rates.",
    ticketCharge:
      "Ticket triage and remote support are included. Onsite labour is invoiced separately at the Essential rate.",
    tone: "brand",
  },
  protection: {
    key: "protection",
    name: "Protection Bundle",
    blurb:
      "Premium managed service across every PI Network-supported system at this site, with a contractual response Service Level Agreement and onsite labour included.",
    sla: "24 Business-Hour response SLA. 24x7 incident triage and prioritisation.",
    scope:
      "Network, Voice, POS, CCTV, Endpoint and IT Support across all in-scope devices at this site.",
    onsite: "Onsite labour included at no additional charge.",
    materials: "Materials and consumables billable at standard rates.",
    ticketCharge:
      "Ticket triage, remote support and onsite labour are included. Materials remain billable.",
    tone: "success",
  },
  enterprise_protection: {
    key: "enterprise_protection",
    name: "Enterprise Protection (customized)",
    blurb:
      "Premium managed service delivered as per the executed enterprise services agreement. Coverage, response targets and commercial terms are negotiated on a per-customer basis.",
    sla: "Per executed enterprise services agreement.",
    scope:
      "Per executed enterprise services agreement. May extend beyond standard PI Network-supported systems where contracted.",
    onsite: "Per executed enterprise services agreement.",
    materials: "Per executed enterprise services agreement.",
    ticketCharge:
      "Per executed enterprise services agreement. Refer to your account manager for the current schedule.",
    tone: "brand",
  },
  no_support: {
    key: "no_support",
    name: "No Support",
    blurb:
      "PI Network does not deliver an ongoing managed service at this site. Service requests are accepted on a billable, best-effort basis.",
    sla: "No Service Level Agreement. Response is best-effort and subject to engineer availability.",
    scope:
      "Out of scope. PI Network does not own the underlying connectivity at this site.",
    onsite: "Onsite labour billable at PI Network's standard rates.",
    materials: "Materials and consumables billable at standard rates.",
    ticketCharge:
      "All service requests are billable, including initial diagnosis and remote support.",
    tone: "warning",
  },
};

export function getSupportPack(key: SupportPack | undefined): SupportPackMeta {
  return SUPPORT_PACKS[key ?? "no_support"];
}
