import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser, isInternal } from "@/lib/auth";
import { projects, sites } from "@/lib/data";
import { persistProjects } from "@/lib/server-data";
import { recordActivity } from "@/lib/activity";
import type { Project, ProjectStatus } from "@/lib/types";

const VALID_CATEGORIES: Project["category"][] = [
  "New Store Opening",
  "CCTV Upgrade",
  "POS Rollout",
  "Router Replacement",
  "Network Upgrade",
];
const VALID_STATUSES: ProjectStatus[] = [
  "Planning",
  "Hardware Ordered",
  "Staging",
  "In Transit",
  "Onsite Scheduled",
  "Installed",
  "Completed",
];

export async function GET() {
  const me = await getCurrentUser();
  if (!me || !isInternal(me))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ projects: projects.slice() });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || !isInternal(me))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Partial<Project>;
  const name = (b.name ?? "").trim();
  const siteId = (b.siteId ?? "").trim();
  const owner = (b.owner ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!sites.some((s) => s.id === siteId))
    return NextResponse.json({ error: "valid siteId required" }, { status: 400 });
  if (!VALID_CATEGORIES.includes(b.category as Project["category"]))
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  const status = VALID_STATUSES.includes(b.status as ProjectStatus)
    ? (b.status as ProjectStatus)
    : "Planning";
  const progress = Math.max(
    0,
    Math.min(100, Number(b.progress) || 0),
  );

  const project: Project = {
    id: `p-${randomBytes(4).toString("hex")}`,
    name,
    siteId,
    category: b.category as Project["category"],
    status,
    startDate: (b.startDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
    expectedCompletion: (b.expectedCompletion ?? "").slice(0, 10),
    owner,
    progress,
  };
  projects.unshift(project);
  await persistProjects();
  void recordActivity("project", `Project created: ${project.name}`);
  return NextResponse.json({ ok: true, project });
}
