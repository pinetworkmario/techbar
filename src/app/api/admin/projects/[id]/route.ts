import { NextResponse } from "next/server";
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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me || !isInternal(me))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const p = projects.find((x) => x.id === id);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Partial<Project>;
  const prevStatus = p.status;
  if (typeof b.name === "string") p.name = b.name.trim();
  if (typeof b.siteId === "string" && sites.some((s) => s.id === b.siteId))
    p.siteId = b.siteId;
  if (
    typeof b.category === "string" &&
    VALID_CATEGORIES.includes(b.category as Project["category"])
  )
    p.category = b.category as Project["category"];
  if (
    typeof b.status === "string" &&
    VALID_STATUSES.includes(b.status as ProjectStatus)
  )
    p.status = b.status as ProjectStatus;
  if (typeof b.startDate === "string")
    p.startDate = b.startDate.slice(0, 10);
  if (typeof b.expectedCompletion === "string")
    p.expectedCompletion = b.expectedCompletion.slice(0, 10);
  if (typeof b.owner === "string") p.owner = b.owner.trim();
  if (typeof b.progress === "number")
    p.progress = Math.max(0, Math.min(100, b.progress));
  await persistProjects();
  if (prevStatus !== p.status) {
    void recordActivity(
      "project",
      `${p.name}: ${prevStatus} → ${p.status} (${p.progress}%)`,
    );
  }
  return NextResponse.json({ ok: true, project: p });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me || !isInternal(me))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const i = projects.findIndex((x) => x.id === id);
  if (i === -1)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  projects.splice(i, 1);
  await persistProjects();
  return NextResponse.json({ ok: true });
}
