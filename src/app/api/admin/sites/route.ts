import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import { persistSites } from "@/lib/server-data";
import { syncSiteFromRuijie } from "@/lib/ruijie-sync";
import type {
  Contact,
  ServiceKey,
  Site,
  SiteHealth,
  SupportPack,
} from "@/lib/types";

const VALID_PACKS: SupportPack[] = [
  "isp_only",
  "essential",
  "protection",
  "enterprise_protection",
  "no_support",
];

const VALID_HEALTH: SiteHealth[] = ["Healthy", "Warning", "Critical"];
const VALID_SERVICES: ServiceKey[] = [
  "network",
  "fourg_backup",
  "voice",
  "pos",
  "cctv",
  "endpoint",
  "it_support",
  "microsoft",
  "projects",
];

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  const state = String(body.state || "").trim();
  const address = String(body.address || "").trim();
  const health: SiteHealth = VALID_HEALTH.includes(body.health)
    ? body.health
    : "Healthy";
  const servicesCovered: ServiceKey[] = Array.isArray(body.servicesCovered)
    ? body.servicesCovered.filter((s: string) =>
        VALID_SERVICES.includes(s as ServiceKey),
      )
    : [];
  const contactName = String(body.contactName || "").trim();
  const contactRole = String(body.contactRole || "Site Manager").trim();
  const contactPhone = String(body.contactPhone || "").trim();
  const contactEmail = String(body.contactEmail || "").trim();
  const notes = body.notes ? String(body.notes).trim() : undefined;

  if (!name || !state || !address) {
    return NextResponse.json(
      { error: "Name, state and address are required" },
      { status: 400 },
    );
  }
  if (!contactName) {
    return NextResponse.json(
      { error: "Main contact name is required" },
      { status: 400 },
    );
  }

  const id = "site-" + randomBytes(6).toString("hex");
  const mainContact: Contact = {
    id: "c-" + id,
    name: contactName,
    role: contactRole,
    phone: contactPhone,
    email: contactEmail,
  };

  const supportPack: SupportPack = VALID_PACKS.includes(body.supportPack)
    ? body.supportPack
    : "no_support";
  const site: Site = {
    id,
    name,
    state,
    address,
    health,
    servicesCovered,
    devicesCount: 0,
    openTickets: 0,
    maintenanceDue: 0,
    mainContact,
    notes,
    recommendations: [],
    supportPack,
  };
  sites.push(site);
  await persistSites();

  // Best-effort: try to auto-sync devices from Ruijie if a matching group exists.
  let sync: Awaited<ReturnType<typeof syncSiteFromRuijie>> | null = null;
  try {
    sync = await syncSiteFromRuijie(site);
  } catch (e) {
    console.warn("[admin/sites POST] auto-sync skipped:", e);
  }

  return NextResponse.json({ ok: true, site, sync });
}
