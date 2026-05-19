import type {
  CoverageStatus,
  DeviceStatus,
  LifecycleStage,
  MaintenancePriority,
  MaintenanceStatus,
  ProjectStatus,
  SiteHealth,
  TicketStatus,
} from "@/lib/types";
import { Badge } from "./Badge";

export function SiteHealthBadge({ health }: { health: SiteHealth }) {
  if (health === "Healthy") return <Badge tone="success">Healthy</Badge>;
  if (health === "Warning") return <Badge tone="warning">Warning</Badge>;
  return <Badge tone="danger">Critical</Badge>;
}

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  const map: Record<DeviceStatus, [string, "success" | "warning" | "danger" | "info" | "muted"]> = {
    Active: ["Active", "success"],
    Warning: ["Warning", "warning"],
    Offline: ["Offline", "danger"],
    "In Support": ["In Support", "info"],
    "Not Monitored": ["Not Monitored", "muted"],
  };
  const [label, tone] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, "info" | "brand" | "warning" | "neutral" | "success" | "muted"> = {
    New: "info",
    "In Progress": "brand",
    "Waiting for Customer": "warning",
    Scheduled: "neutral",
    Resolved: "success",
    Closed: "muted",
  };
  return <Badge tone={map[status]}>{status}</Badge>;
}

export function LifecycleBadge({ stage }: { stage: LifecycleStage }) {
  const map: Record<LifecycleStage, "neutral" | "info" | "brand" | "success" | "warning" | "danger" | "muted"> = {
    Planned: "neutral",
    Supplied: "info",
    Staged: "info",
    Installed: "brand",
    "In Service": "success",
    "Maintenance Due": "warning",
    "Replacement Recommended": "danger",
    Retired: "muted",
  };
  return <Badge tone={map[stage]}>{stage}</Badge>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const map: Record<ProjectStatus, "neutral" | "info" | "warning" | "brand" | "success"> = {
    Planning: "neutral",
    "Hardware Ordered": "info",
    Staging: "info",
    "In Transit": "warning",
    "Onsite Scheduled": "brand",
    Installed: "success",
    Completed: "success",
  };
  return <Badge tone={map[status]}>{status}</Badge>;
}

export function CoverageCell({ value }: { value?: CoverageStatus }) {
  if (!value) return <Badge tone="muted">—</Badge>;
  if (value === "Yes") return <Badge tone="success">Yes</Badge>;
  if (value === "No") return <Badge tone="muted">No</Badge>;
  if (value === "Partial") return <Badge tone="warning">Partial</Badge>;
  return <Badge tone="brand">Recommended</Badge>;
}

export function MaintenancePriorityBadge({
  priority,
}: {
  priority: MaintenancePriority;
}) {
  const map: Record<MaintenancePriority, "muted" | "info" | "warning" | "danger"> = {
    Low: "muted",
    Medium: "info",
    High: "warning",
    Critical: "danger",
  };
  return <Badge tone={map[priority]}>{priority}</Badge>;
}

export function MaintenanceStatusBadge({
  status,
}: {
  status: MaintenanceStatus;
}) {
  const map: Record<MaintenanceStatus, "neutral" | "warning" | "danger" | "success"> = {
    Scheduled: "neutral",
    Due: "warning",
    Overdue: "danger",
    Completed: "success",
  };
  return <Badge tone={map[status]}>{status}</Badge>;
}
