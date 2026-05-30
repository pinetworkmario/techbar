import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { allowedSiteIds, getCurrentUser, isCustomerUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import { persistSites } from "@/lib/server-data";
import { listUsers, saveUsers, type ServiceCategoryKey } from "@/lib/store";
import { recordActivity } from "@/lib/activity";
import type { Contact, Site, SiteHealth } from "@/lib/types";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const allIds = sites.map((s) => s.id);
  const allowed = new Set(allowedSiteIds(me, allIds));
  const visible = sites
    .filter((s) => allowed.has(s.id))
    .map((s) => ({ id: s.id, name: s.name, state: s.state }));
  return NextResponse.json({ sites: visible });
}

/** All modules a freshly-created customer site grants the creator. Matches
 * the keys the admin Permissions matrix uses. */
const DEFAULT_GRANT: ServiceCategoryKey[] = [
  "network",
  "voice",
  "cctv",
  "pos",
  "endpoint",
  "it_support",
  "projects",
  "traffic_analysis",
];

/** Customer self-service site creation. Only L1 customer admins (no
 * parentUserId) may create sites — L2 sub-contacts are blocked. The creator
 * is auto-granted full module permissions on the new site so they don't have
 * to wait for PI Network to do it. */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isCustomerUser(me))
    return NextResponse.json(
      {
        error:
          "Sub-contacts can't create sites. Ask the customer admin on your account.",
      },
      { status: 403 },
    );

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const state = String(body.state || "").trim();
  const address = String(body.address || "").trim();
  if (!name || !state || !address)
    return NextResponse.json(
      { error: "Name, state and address are required" },
      { status: 400 },
    );

  const id = "site-" + randomBytes(6).toString("hex");
  const mainContact: Contact = {
    id: "c-" + id,
    // Customer creates the site → they are the natural primary contact.
    name: me.name || me.email,
    role: String(body.contactRole || "Site Manager").trim(),
    phone: String(body.contactPhone || "").trim(),
    email: me.email,
  };
  const site: Site = {
    id,
    name,
    state,
    address,
    health: "Healthy" as SiteHealth,
    servicesCovered: [],
    devicesCount: 0,
    openTickets: 0,
    maintenanceDue: 0,
    mainContact,
    notes: body.notes ? String(body.notes).trim() : undefined,
    recommendations: [],
    supportPack: "no_support",
  };
  sites.push(site);
  await persistSites();

  // Grant the creator full module permissions on this site.
  try {
    const users = await listUsers();
    const u = users.find((x) => x.id === me.id);
    if (u) {
      u.permissions = {
        ...(u.permissions || {}),
        [id]: DEFAULT_GRANT,
      };
      u.updatedAt = new Date().toISOString();
      await saveUsers(users);
    }
  } catch (e) {
    console.warn("[account/sites POST] permission grant failed:", e);
  }

  void recordActivity(
    "service",
    `New site "${site.name}" self-created by ${me.email}`,
  );

  return NextResponse.json({ ok: true, site });
}
