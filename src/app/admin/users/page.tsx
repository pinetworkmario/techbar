import { sites } from "@/lib/data";
import { listSiteGroups } from "@/lib/site-groups";
import { AdminUsersClient } from "./AdminUsersClient";

export default function AdminUsersPage() {
  const groups = listSiteGroups().map((g) => ({
    id: g.id,
    name: g.name,
    siteIds: g.siteIds,
  }));
  return (
    <AdminUsersClient
      sites={sites.map((s) => ({ id: s.id, name: s.name }))}
      groups={groups}
    />
  );
}
