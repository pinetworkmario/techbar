import { redirect } from "next/navigation";
import { Suspense } from "react";
import { allowedSiteIds, getCurrentUser } from "@/lib/auth";
import { sites, tickets } from "@/lib/data";
import "@/lib/server-data";
import { TicketsClient } from "./TicketsClient";

export default async function TicketsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/portal/tickets");
  const allowed = new Set(allowedSiteIds(me, sites.map((s) => s.id)));
  const visibleTickets = me.isAdmin
    ? tickets.slice()
    : tickets.filter((t) => allowed.has(t.siteId));
  const visibleSites = sites
    .filter((s) => allowed.has(s.id))
    .map((s) => ({ id: s.id, name: s.name }));
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
      <TicketsClient
        initialTickets={visibleTickets}
        sites={visibleSites}
        isAdmin={me.isAdmin}
      />
    </Suspense>
  );
}
