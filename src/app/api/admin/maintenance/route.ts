import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { devices, maintenanceItems, sites } from "@/lib/data";
import { persistMaintenance } from "@/lib/server-data";
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

export async function GET() {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sorted = maintenanceItems
    .slice()
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  return NextResponse.json({ items: sorted });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Partial<MaintenanceItem>;
  const siteId = (b.siteId ?? "").trim();
  if (!sites.some((s) => s.id === siteId))
    return NextResponse.json({ error: "valid siteId required" }, { status: 400 });
  const type = (b.type ?? "").trim();
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });
  const dueDate = (b.dueDate ?? "").slice(0, 10);
  if (!dueDate)
    return NextResponse.json({ error: "dueDate required" }, { status: 400 });
  const priority = VALID_PRIORITY.includes(b.priority as MaintenancePriority)
    ? (b.priority as MaintenancePriority)
    : "Medium";
  const status = VALID_STATUS.includes(b.status as MaintenanceStatus)
    ? (b.status as MaintenanceStatus)
    : "Scheduled";
  const deviceId = (b.deviceId ?? "").trim() || undefined;
  const dev = deviceId ? devices.find((d) => d.id === deviceId) : undefined;
  const deviceName = dev?.name || (b.deviceName ?? "").trim() || "(site-wide)";

  const item: MaintenanceItem = {
    id: `m-${randomBytes(4).toString("hex")}`,
    siteId,
    deviceId,
    deviceName,
    type,
    dueDate,
    priority,
    status,
    assignedTeam: (b.assignedTeam ?? "Operations").trim(),
  };
  maintenanceItems.unshift(item);
  await persistMaintenance();
  return NextResponse.json({ ok: true, item });
}
