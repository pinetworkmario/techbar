import { redirect } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { devices, sites } from "@/lib/data";
import { allowedSiteIds, getCurrentUser, isCustomerUser } from "@/lib/auth";
import { getSupportPack } from "@/lib/support-packs";
import { SitesListClient, type SiteCardData } from "./SitesListClient";
import { AddSiteButton } from "./AddSiteButton";

export default async function SitesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/portal/sites");
  const allIds = sites.map((s) => s.id);
  const allowed = new Set(allowedSiteIds(me, allIds));
  const visible = sites.filter((s) => allowed.has(s.id));

  const cardData: SiteCardData[] = visible.map((s) => {
    const siteDevices = devices.filter((d) => d.siteId === s.id);
    const online = siteDevices.filter((d) => d.status === "Active").length;
    const pack = getSupportPack(s.supportPack);
    return {
      id: s.id,
      name: s.name,
      state: s.state,
      address: s.address,
      health: s.health,
      servicesCovered: s.servicesCovered as string[],
      devicesCount: s.devicesCount,
      openTickets: s.openTickets,
      maintenanceDue: s.maintenanceDue,
      mainContactName: s.mainContact.name,
      mainContactRole: s.mainContact.role,
      online,
      total: siteDevices.length,
      ruijieLinked: !!s.ruijieGroupId,
      supportPackKey: pack.key,
      supportPackLabel: pack.name,
      supportPackTone: pack.tone,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Sites"
        description={
          me.isAdmin
            ? "All customer sites — admin view. Click a site to drill in."
            : "Click a site to drill into Network, Voice, POS, CCTV, Endpoint, IT Support and Projects."
        }
        actions={
          <div className="flex items-center gap-2">
            {isCustomerUser(me) ? null : <AddSiteButton />}
            <LinkButton href="/portal/tickets?create=1" variant="secondary">
              <PlusCircle className="h-4 w-4" /> Create Ticket
            </LinkButton>
          </div>
        }
      />
      <SitesListClient sites={cardData} />
    </div>
  );
}
