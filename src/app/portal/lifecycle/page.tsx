import {
  AlertOctagon,
  CalendarRange,
  History,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Button, LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  LifecycleBadge,
  MaintenancePriorityBadge,
  MaintenanceStatusBadge,
} from "@/components/ui/StatusBadges";
import { devices, getSiteName, maintenanceItems } from "@/lib/data";
import type { LifecycleStage } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const STAGES: LifecycleStage[] = [
  "Planned",
  "Supplied",
  "Staged",
  "Installed",
  "In Service",
  "Maintenance Due",
  "Replacement Recommended",
  "Retired",
];

export default function LifecyclePage() {
  const today = new Date("2026-05-08");

  const inWarranty = devices.filter(
    (d) => new Date(d.warrantyExpiry) >= today,
  );
  const dueForReplacement = devices.filter(
    (d) => d.lifecycleStage === "Replacement Recommended",
  );
  const dueForMaintenance = maintenanceItems.filter(
    (m) => m.status === "Due" || m.status === "Overdue",
  );
  const upcomingRenewals = devices.filter((d) => {
    const days =
      (new Date(d.warrantyExpiry).getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24);
    return days > 0 && days < 120;
  });

  const recommendations: { text: string; tone: "warning" | "danger" | "brand" }[] = [
    {
      text: "Box Hill Store does not have 4G backup",
      tone: "warning",
    },
    {
      text: "Sydney Store CCTV system is not under maintenance plan",
      tone: "danger",
    },
    {
      text: `${upcomingRenewals.length} devices are approaching warranty expiry`,
      tone: "warning",
    },
    {
      text: "4 POS devices are not covered by Endpoint Support",
      tone: "brand",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lifecycle & Maintenance"
        description="Keep every site, device and service maintained from installation to replacement."
        actions={
          <>
            <LinkButton
              href="/portal/tickets?create=1"
              variant="secondary"
            >
              <PlusCircle className="h-4 w-4" /> Request Maintenance
            </LinkButton>
            <Button>
              <CalendarRange className="h-4 w-4" /> Schedule Site Health Check
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatTile
          label="Devices under management"
          value={devices.length}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="brand"
        />
        <StatTile
          label="Devices under warranty"
          value={inWarranty.length}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="success"
          hint={`${devices.length - inWarranty.length} out of warranty`}
        />
        <StatTile
          label="Maintenance due"
          value={dueForMaintenance.length}
          icon={<Wrench className="h-5 w-5" />}
          tone="warning"
          hint={`${maintenanceItems.filter((m) => m.status === "Overdue").length} overdue`}
        />
        <StatTile
          label="Replacement recommended"
          value={dueForReplacement.length}
          icon={<RefreshCw className="h-5 w-5" />}
          tone="danger"
        />
        <StatTile
          label="Upcoming renewals (120d)"
          value={upcomingRenewals.length}
          icon={<CalendarRange className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader title="Lifecycle Stages" />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {STAGES.map((stage) => {
              const count = devices.filter((d) => d.lifecycleStage === stage)
                .length;
              return (
                <div
                  key={stage}
                  className="rounded-lg border border-slate-100 p-3"
                >
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {stage}
                  </div>
                  <div className="mt-1 flex items-end justify-between">
                    <div className="text-xl font-semibold text-slate-900">
                      {count}
                    </div>
                    <LifecycleBadge stage={stage} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Maintenance Schedule"
          subtitle="Scheduled, due and overdue items across all sites"
          action={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                <History className="h-4 w-4" /> Maintenance History
              </Button>
              <Button size="sm">
                <PlusCircle className="h-4 w-4" /> Request Maintenance
              </Button>
            </div>
          }
        />
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Site</th>
                <th className="px-5 py-3">Device</th>
                <th className="px-5 py-3">Maintenance type</th>
                <th className="px-5 py-3">Due date</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Assigned team</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {maintenanceItems.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {getSiteName(m.siteId)}
                  </td>
                  <td className="px-5 py-3 text-slate-700">{m.deviceName}</td>
                  <td className="px-5 py-3 text-slate-700">{m.type}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {formatDate(m.dueDate)}
                  </td>
                  <td className="px-5 py-3">
                    <MaintenancePriorityBadge priority={m.priority} />
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {m.assignedTeam}
                  </td>
                  <td className="px-5 py-3">
                    <MaintenanceStatusBadge status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Risk recommendations"
            subtitle="Generated from coverage gaps, lifecycle stage and warranty data"
          />
          <CardBody>
            <ul className="space-y-2">
              {recommendations.map((r, i) => (
                <li
                  key={i}
                  className={
                    "flex items-start gap-3 rounded-lg border p-3 text-sm " +
                    (r.tone === "danger"
                      ? "border-rose-100 bg-rose-50 text-rose-900"
                      : r.tone === "warning"
                        ? "border-amber-100 bg-amber-50 text-amber-900"
                        : "border-brand-100 bg-brand-50 text-brand-900")
                  }
                >
                  {r.tone === "danger" ? (
                    <ShieldAlert className="mt-0.5 h-4 w-4 text-rose-600" />
                  ) : r.tone === "warning" ? (
                    <AlertOctagon className="mt-0.5 h-4 w-4 text-amber-600" />
                  ) : (
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-brand-600" />
                  )}
                  <span>{r.text}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Maintenance Actions" />
          <CardBody className="space-y-2">
            <Button variant="secondary" className="w-full justify-start">
              <PlusCircle className="h-4 w-4" /> Request Maintenance
            </Button>
            <Button variant="secondary" className="w-full justify-start">
              <CalendarRange className="h-4 w-4" /> Schedule Site Health Check
            </Button>
            <Button variant="secondary" className="w-full justify-start">
              <RefreshCw className="h-4 w-4" /> Request Device Replacement
            </Button>
            <Button variant="secondary" className="w-full justify-start">
              <History className="h-4 w-4" /> View Maintenance History
            </Button>
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              All maintenance actions are <strong>requests</strong> only —
              PI Network plans and confirms each one with you before any onsite
              work.
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Devices recommended for replacement"
          subtitle="Approaching warranty expiry or end of life"
        />
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Device</th>
                <th className="px-5 py-3">Site</th>
                <th className="px-5 py-3">Warranty</th>
                <th className="px-5 py-3">Lifecycle</th>
                <th className="px-5 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...dueForReplacement, ...upcomingRenewals]
                .filter(
                  (d, i, arr) => arr.findIndex((x) => x.id === d.id) === i,
                )
                .slice(0, 8)
                .map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {d.name}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {getSiteName(d.siteId)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatDate(d.warrantyExpiry)}
                    </td>
                    <td className="px-5 py-3">
                      <LifecycleBadge stage={d.lifecycleStage} />
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      <Badge tone="warning">
                        {d.lifecycleStage === "Replacement Recommended"
                          ? "Replacement"
                          : "Renewal due"}
                      </Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

    </div>
  );
}
