import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { devices, maintenanceItems, sites } from "@/lib/data";
import { persistMaintenance } from "@/lib/server-data";
import { recordActivity } from "@/lib/activity";
import type {
  MaintenanceItem,
  MaintenancePriority,
  MaintenanceStatus,
} from "@/lib/types";

const VALID_PRIORITY: MaintenancePriority[] = [
  "Low",
  "Medium",
  "High",
  "Critical",
];
const VALID_STATUS: MaintenanceStatus[] = [
  "Scheduled",
  "Due",
  "Overdue",
  "Completed",
];

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const m = maintenanceItems.find((x) => x.id === id);
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Partial<MaintenanceItem>;
  const prevStatus = m.status;
  if (typeof b.siteId === "string" && sites.some((s) => s.id === b.siteId))
    m.siteId = b.siteId;
  if (typeof b.deviceId === "string") {
    const v = b.deviceId.trim();
    m.deviceId = v || undefined;
    if (v) {
      const dev = devices.find((d) => d.id === v);
      if (dev) m.deviceName = dev.name;
    }
  }
  if (typeof b.deviceName === "string") m.deviceName = b.deviceName.trim();
  if (typeof b.type === "string") m.type = b.type.trim();
  if (typeof b.dueDate === "string") m.dueDate = b.dueDate.slice(0, 10);
  if (
    typeof b.priority === "string" &&
    VALID_PRIORITY.includes(b.priority as MaintenancePriority)
  )
    m.priority = b.priority as MaintenancePriority;
  if (
    typeof b.status === "string" &&
    VALID_STATUS.includes(b.status as MaintenanceStatus)
  )
    m.status = b.status as MaintenanceStatus;
  if (typeof b.assignedTeam === "string") m.assignedTeam = b.assignedTeam.trim();
  await persistMaintenance();
  if (prevStatus !== m.status && m.status === "Completed") {
    void recordActivity(
      "maintenance",
      `Completed: ${m.type} on ${m.deviceName}`,
    );
  }
  return NextResponse.json({ ok: true, item: m });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const i = maintenanceItems.findIndex((x) => x.id === id);
  if (i === -1)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  maintenanceItems.splice(i, 1);
  await persistMaintenance();
  return NextResponse.json({ ok: true });
}
