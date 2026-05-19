import { notFound, redirect } from "next/navigation";
import {
  allowedModulesForSite,
  canAccessSite,
  getCurrentUser,
} from "@/lib/auth";
import { getDevicesForSite, getSiteById } from "@/lib/data";
import { getDeviceOverrides } from "@/lib/store";
import { SiteChat } from "@/components/portal/SiteChat";
import { SiteDetailClient } from "./SiteDetailClient";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const me = await getCurrentUser();
  if (!me) redirect(`/login?next=/portal/sites/${siteId}`);
  const site = getSiteById(siteId);
  if (!site) notFound();
  if (!canAccessSite(me, site.id)) redirect("/portal/sites");
  const overrides = await getDeviceOverrides();
  const allowed = allowedModulesForSite(me, site.id);
  const siteDevices = getDevicesForSite(site.id);
  return (
    <>
      <SiteDetailClient
        site={site}
        siteDevices={siteDevices}
        overrides={overrides}
        allowedModules={allowed}
        isAdmin={me.isAdmin}
      />
      <SiteChat siteId={site.id} siteName={site.name} />
    </>
  );
}
