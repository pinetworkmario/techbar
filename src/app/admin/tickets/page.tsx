import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser, isInternal } from "@/lib/auth";
import { sites, tickets } from "@/lib/data";
import { TicketsClient } from "./TicketsClient";

export default async function TicketsPage() {
  const me = await getCurrentUser();
  if (!me || !isInternal(me)) redirect("/login?next=/admin/tickets");
  const sorted = tickets
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
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
        <h1 className="text-2xl font-semibold text-slate-900">Tickets</h1>
        <p className="text-sm text-slate-500">
          All support tickets — created via the customer portal's "Create
          Ticket" buttons. Update status, assigned team, and latest update.
          Customers see <span className="font-medium">latestUpdate</span>{" "}
          verbatim on their tickets page.
        </p>
      </div>
      <TicketsClient initial={sorted} sites={siteOptions} />
    </div>
  );
}
