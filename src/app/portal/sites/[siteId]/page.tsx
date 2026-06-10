import { notFound, redirect } from "next/navigation";
import {
  allowedModulesForSite,
  canAccessSite,
  getCurrentUser,
} from "@/lib/auth";
import { getDevicesForSite, getSiteById } from "@/lib/data";
import { getDeviceOverrides } from "@/lib/store";
import { SiteChat } from "@/components/portal/SiteChat";
import { SupportFloatingButton } from "@/components/portal/SupportFloatingButton";
import { getLang } from "@/lib/i18n";
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
  const lang = await getLang();
  return (
    <>
      <SiteDetailClient
        site={site}
        siteDevices={siteDevices}
        overrides={overrides}
        allowedModules={allowed}
        isAdmin={me.isAdmin}
        lang={lang}
      />
      <SiteChat siteId={site.id} siteName={site.name} />
      <SupportFloatingButton lang={lang} />
    </>
  );
}
