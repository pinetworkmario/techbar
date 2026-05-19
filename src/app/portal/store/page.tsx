import { redirect } from "next/navigation";
import { allowedSiteIds, getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import { catalog } from "@/lib/store-catalog";
import { StoreClient } from "./StoreClient";

export default async function StorePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/portal/store");
  const allowed = new Set(
    allowedSiteIds(
      me,
      sites.map((s) => s.id),
    ),
  );
  const visibleSites = sites
    .filter((s) => allowed.has(s.id))
    .map((s) => ({ id: s.id, name: s.name }));
  const items = catalog.filter((c) => c.active !== false);
  return <StoreClient items={items} sites={visibleSites} />;
}
