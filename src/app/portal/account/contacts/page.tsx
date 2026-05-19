import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { allowedModulesForSite, getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import type { ServiceCategoryKey } from "@/lib/store";
import { ContactsClient } from "./ContactsClient";

export default async function ContactsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/portal/account/contacts");
  if (me.parentUserId) redirect("/portal/account");

  // Build the matrix of allowed sites/modules for this user — sub-contacts can
  // only get a subset.
  const allowedScope: { siteId: string; siteName: string; modules: ServiceCategoryKey[] }[] =
    sites
      .filter((s) => me.isAdmin || me.permissions[s.id])
      .map((s) => ({
        siteId: s.id,
        siteName: s.name,
        modules: allowedModulesForSite(me, s.id),
      }))
      .filter((row) => row.modules.length > 0);

  return (
    <div className="space-y-6">
      <Link
        href="/portal/account"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> My Account
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Contacts</h1>
        <p className="text-sm text-slate-500">
          Create additional logins for your team. Each contact can be granted
          access to a subset of the sites and modules you have access to.
          Contacts cannot create further accounts.
        </p>
      </div>
      <ContactsClient allowedScope={allowedScope} />
    </div>
  );
}
