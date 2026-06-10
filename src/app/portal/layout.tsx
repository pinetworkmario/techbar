import { redirect } from "next/navigation";
import { getCurrentUser, isCustomerUser } from "@/lib/auth";
import { getLang } from "@/lib/i18n";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { MobileNav } from "@/components/portal/MobileNav";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/portal/sites");
  const lang = await getLang();
  const userInfo = {
    name: me.name,
    email: me.email,
    isAdmin: me.isAdmin,
    isContactManager: !isCustomerUser(me),
  };
  return (
    <div className="flex min-h-screen bg-slate-50">
      <PortalSidebar user={userInfo} lang={lang} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <MobileNav user={userInfo} />
          <div className="text-sm font-semibold text-slate-900">
            PI Network Portal
          </div>
        </div>
        <PortalHeader />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
