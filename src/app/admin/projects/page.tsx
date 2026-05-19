import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { projects, sites } from "@/lib/data";
import { ProjectsClient } from "./ProjectsClient";

export default async function ProjectsPage() {
  const me = await getCurrentUser();
  if (!me?.isAdmin) redirect("/login?next=/admin/projects");
  const sorted = projects
    .slice()
    .sort((a, b) =>
      (b.startDate || "").localeCompare(a.startDate || ""),
    );
  const siteOptions = sites.map((s) => ({ id: s.id, name: s.name }));
  return (
    <div className="space-y-4">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Admin home
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
        <p className="text-sm text-slate-500">
          Track project status + progress visible to customers on{" "}
          <code>/portal/projects</code>.
        </p>
      </div>
      <ProjectsClient initial={sorted} sites={siteOptions} />
    </div>
  );
}
