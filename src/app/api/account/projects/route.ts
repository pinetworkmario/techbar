import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import {
  allowedSiteIds,
  canAccessSite,
  getCurrentUser,
} from "@/lib/auth";
import { projects, sites, tickets } from "@/lib/data";
import {
  persistProjects,
  persistSites,
  persistTickets,
} from "@/lib/server-data";
import { listUsers, saveUsers, type ServiceCategoryKey } from "@/lib/store";
import { recordActivity } from "@/lib/activity";
import type {
  Contact,
  Project,
  Site,
  SiteHealth,
  Ticket,
} from "@/lib/types";

const VALID_CATEGORIES: Project["category"][] = [
  "New Store Opening",
  "CCTV Upgrade",
  "POS Rollout",
  "Router Replacement",
  "Network Upgrade",
];

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

function nextTicketNumber(): string {
  const max = tickets.reduce((acc, t) => {
    const m = /^PI-(\d+)$/.exec(t.number);
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 1000);
  return `PI-${max + 1}`;
}

/** Customer-side: request a new project. Optionally also create a brand
 * new site (auto-granting permissions to the requester). Spawns one
 * Project record + one Ticket assigned to the Projects team so PI Network
 * can plan and execute. */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim();
  const category = VALID_CATEGORIES.includes(body.category)
    ? (body.category as Project["category"])
    : "New Store Opening";
  const expectedCompletion = String(body.expectedCompletion || "").slice(0, 10);
  const newSite = body.newSite as
    | { name?: string; state?: string; address?: string }
    | undefined;
  const existingSiteId = String(body.siteId || "").trim();

  if (!name)
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 },
    );

  // Resolve site: either create a new one or use existing.
  let siteId = "";
  let siteName = "";
  let createdSite = false;
  if (newSite && newSite.name && newSite.state && newSite.address) {
    if (me.parentUserId)
      return NextResponse.json(
        { error: "Sub-contacts can't create new sites." },
        { status: 403 },
      );
    siteId = "site-" + randomBytes(6).toString("hex");
    siteName = newSite.name.trim();
    const mainContact: Contact = {
      id: "c-" + siteId,
      name: me.name || me.email,
      role: "Site Manager",
      phone: "",
      email: me.email,
    };
    const site: Site = {
      id: siteId,
      name: siteName,
      state: newSite.state.trim(),
      address: newSite.address.trim(),
      health: "Healthy" as SiteHealth,
      servicesCovered: [],
      devicesCount: 0,
      openTickets: 0,
      maintenanceDue: 0,
      mainContact,
      recommendations: [],
      supportPack: "no_support",
    };
    sites.push(site);
    await persistSites();
    createdSite = true;
    // Grant the creator permissions on the new site.
    try {
      const users = await listUsers();
      const u = users.find((x) => x.id === me.id);
      if (u) {
        u.permissions = {
          ...(u.permissions || {}),
          [siteId]: DEFAULT_GRANT,
        };
        u.updatedAt = new Date().toISOString();
        await saveUsers(users);
      }
    } catch (e) {
      console.warn("[account/projects POST] permission grant failed:", e);
    }
    void recordActivity(
      "service",
      `New site "${siteName}" auto-created via project request by ${me.email}`,
    );
  } else if (existingSiteId) {
    const site = sites.find((s) => s.id === existingSiteId);
    if (!site)
      return NextResponse.json(
        { error: "Site not found" },
        { status: 404 },
      );
    if (!canAccessSite(me, site.id))
      return NextResponse.json(
        { error: "You don't have access to that site" },
        { status: 403 },
      );
    siteId = site.id;
    siteName = site.name;
  } else {
    // No site picked + no new site → fall back to creator's first allowed.
    const allowed = allowedSiteIds(me, sites.map((s) => s.id));
    if (allowed.length === 0)
      return NextResponse.json(
        {
          error:
            "Pick an existing site or describe a new one — your account has no sites yet.",
        },
        { status: 400 },
      );
    siteId = allowed[0];
    siteName = sites.find((s) => s.id === siteId)?.name ?? siteId;
  }

  // Create the Project record.
  const project: Project = {
    id: `p-${randomBytes(4).toString("hex")}`,
    name,
    siteId,
    category,
    status: "Planning",
    startDate: new Date().toISOString().slice(0, 10),
    expectedCompletion,
    owner: "Projects Team",
    progress: 0,
  };
  projects.unshift(project);
  await persistProjects();
  void recordActivity(
    "project",
    `Project requested: "${project.name}" (${category}) at ${siteName} by ${me.email}`,
  );

  // Spawn a Ticket assigned to the Projects team so it surfaces in /admin/tickets.
  const ticket: Ticket = {
    id: `t-${randomBytes(4).toString("hex")}`,
    number: nextTicketNumber(),
    siteId,
    deviceOrService: `Project: ${project.name}`,
    issueType: `New ${category} request${createdSite ? " — new site" : ""}`,
    businessImpact: "No major impact",
    status: "New",
    createdAt: new Date().toISOString(),
    assignedTeam: "Projects",
    latestUpdate: `Auto-routed to Projects team for scoping & planning.`,
    description: `Project request from ${me.name || me.email} (${me.email}).
Project: ${project.name}
Category: ${category}
Site: ${siteName}${createdSite ? " (newly created)" : ""}
Expected completion: ${expectedCompletion || "(not specified)"}
${description ? `\nCustomer description:\n${description}` : ""}`,
  };
  tickets.unshift(ticket);
  await persistTickets();
  void recordActivity(
    "ticket",
    `${ticket.number} auto-created from project request → Projects team`,
  );

  return NextResponse.json({
    ok: true,
    project,
    ticket: { number: ticket.number },
    site: createdSite ? { id: siteId, name: siteName, created: true } : undefined,
  });
}
