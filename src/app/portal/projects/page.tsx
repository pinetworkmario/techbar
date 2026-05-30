import { redirect } from "next/navigation";
import { CalendarRange, Hammer, Truck } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectStatusBadge } from "@/components/ui/StatusBadges";
import { Badge } from "@/components/ui/Badge";
import { getSiteName, projects, sites } from "@/lib/data";
import "@/lib/server-data";
import { allowedSiteIds, getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types";
import { RequestProjectButton } from "./RequestProjectButton";

const STATUS_PIPELINE: ProjectStatus[] = [
  "Planning",
  "Hardware Ordered",
  "Staging",
  "In Transit",
  "Onsite Scheduled",
  "Installed",
  "Completed",
];

export default async function ProjectsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/portal/projects");
  const allowedIds = new Set(allowedSiteIds(me, sites.map((s) => s.id)));
  const visibleProjects = projects.filter((p) => allowedIds.has(p.siteId));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Installations, rollouts and new site openings, tracked from planning to handover."
        actions={<RequestProjectButton />}
      />

      <Card>
        <CardHeader title="Active projects" />
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Project</th>
                <th className="px-5 py-3">Site</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Start</th>
                <th className="px-5 py-3">Expected complete</th>
                <th className="px-5 py-3">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-500">
                    No active projects. Click "Request a New Project" to start one.
                  </td>
                </tr>
              ) : (
                visibleProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {p.name}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {getSiteName(p.siteId)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone="neutral" className="bg-slate-50">
                        {p.category}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <ProjectStatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-600">{p.owner}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(p.startDate)}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(p.expectedCompletion)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full bg-brand-500"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {p.progress}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="How projects are delivered"
          subtitle="Every project moves through these stages"
        />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {STATUS_PIPELINE.map((s, i) => (
              <div key={s} className="rounded-lg border border-slate-100 p-3">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Stage {i + 1}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {i < 2 ? (
                    <Hammer className="h-4 w-4 text-slate-400" />
                  ) : i < 5 ? (
                    <Truck className="h-4 w-4 text-slate-400" />
                  ) : (
                    <CalendarRange className="h-4 w-4 text-slate-400" />
                  )}
                  <div className="text-sm font-semibold text-slate-900">
                    {s}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
