import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser, isInternal } from "@/lib/auth";
import { sites } from "@/lib/data";
import { listSiteGroups } from "@/lib/site-groups";
import { SiteGroupsClient } from "./SiteGroupsClient";

export default async function SiteGroupsPage() {
  const me = await getCurrentUser();
  if (!me || !isInternal(me)) redirect("/login?next=/admin/site-groups");
  const groups = listSiteGroups();
  const siteOptions = sites.map((s) => ({
    id: s.id,
    name: s.name,
    state: s.state,
  }));
  return (
    <div className="space-y-4">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Admin home
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Site Groups</h1>
        <p className="text-sm text-slate-500">
          Bundle sites together so you can grant a user access to many sites at
          once from the Users page.
        </p>
      </div>
      <SiteGroupsClient initial={groups} sites={siteOptions} />
    </div>
  );
}
