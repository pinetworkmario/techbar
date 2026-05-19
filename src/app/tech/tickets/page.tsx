import Link from "next/link";
import { redirect } from "next/navigation";
import { sites, tickets } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { TicketsClient } from "@/app/admin/tickets/TicketsClient";

export default async function TechTicketsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/tech/tickets");
  if (!me.isAdmin && !me.isTech) redirect("/portal/sites");
  const sorted = tickets
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const siteOptions = sites.map((s) => ({ id: s.id, name: s.name }));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tickets</h1>
        <p className="text-sm text-slate-500">
          All support tickets across every site. Filter by status, assign, or
          jump to the site for full context.
        </p>
      </div>
      <TicketsClient initial={sorted} sites={siteOptions} />
    </div>
  );
}
