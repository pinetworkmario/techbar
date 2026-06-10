import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isInternal } from "@/lib/auth";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Boxes,
  Building2,
  Gift,
  Hammer,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Tags,
  Wrench,
  Users,
} from "lucide-react";
import { LogoutButton } from "@/components/portal/LogoutButton";
import { pendingCount } from "@/lib/chat-handoffs";
import { AdminSidebarLink } from "./AdminSidebarLink";
import { MobileNav } from "@/components/ui/MobileNav";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { getLang } from "@/lib/i18n";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/admin");
  if (!isInternal(me)) redirect("/portal/sites");

  const handoffPending = pendingCount();
  const lang = await getLang();

  const mobileNavItems = [
    { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    ...(me.isAdmin
      ? [{ href: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> }]
      : []),
    { href: "/admin/sites", label: "Sites & Devices", icon: <Building2 className="h-4 w-4" /> },
    { href: "/admin/site-groups", label: "Site Groups", icon: <Boxes className="h-4 w-4" /> },
    { href: "/admin/tickets", label: "Tickets", icon: <LifeBuoy className="h-4 w-4" /> },
    { href: "/admin/projects", label: "Projects", icon: <Hammer className="h-4 w-4" /> },
    { href: "/admin/maintenance", label: "Maintenance", icon: <Wrench className="h-4 w-4" /> },
    ...(me.isAdmin
      ? [
          { href: "/admin/help-articles", label: "Help Articles", icon: <BookOpen className="h-4 w-4" /> },
          { href: "/admin/referral", label: "Referrals", icon: <Gift className="h-4 w-4" /> },
          { href: "/admin/activity", label: "Activity Log", icon: <Activity className="h-4 w-4" /> },
        ]
      : []),
    { href: "/admin/orders", label: "Orders", icon: <ShoppingBag className="h-4 w-4" /> },
    ...(me.isAdmin
      ? [{ href: "/admin/catalog", label: "Store Catalog", icon: <Tags className="h-4 w-4" /> }]
      : []),
    {
      href: "/admin/chat-handoffs",
      label: "Chat Handoffs",
      icon: <MessageCircle className="h-4 w-4" />,
    },
    { href: "/portal/sites", label: "Back to portal", icon: <ArrowLeft className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <MobileNav
        items={mobileNavItems}
        tone="light"
        brandSlot={
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-white shadow-soft">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight text-slate-900">
                PI Network
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Admin Console
              </div>
            </div>
          </div>
        }
      />
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-white shadow-soft">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight text-slate-900">
              PI Network
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Admin Console
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3 text-sm">
          <AdminSidebarLink href="/admin" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" exact />
          {me.isAdmin ? (
            <AdminSidebarLink href="/admin/users" icon={<Users className="h-4 w-4" />} label="Users" />
          ) : null}
          <AdminSidebarLink href="/admin/sites" icon={<Building2 className="h-4 w-4" />} label="Sites & Devices" />
          <AdminSidebarLink href="/admin/site-groups" icon={<Boxes className="h-4 w-4" />} label="Site Groups" />
          <AdminSidebarLink href="/admin/tickets" icon={<LifeBuoy className="h-4 w-4" />} label="Tickets" />
          <AdminSidebarLink href="/admin/projects" icon={<Hammer className="h-4 w-4" />} label="Projects" />
          <AdminSidebarLink href="/admin/maintenance" icon={<Wrench className="h-4 w-4" />} label="Maintenance" />
          {me.isAdmin ? (
            <>
              <AdminSidebarLink href="/admin/help-articles" icon={<BookOpen className="h-4 w-4" />} label="Help Articles" />
              <AdminSidebarLink href="/admin/referral" icon={<Gift className="h-4 w-4" />} label="Referrals" />
              <AdminSidebarLink href="/admin/activity" icon={<Activity className="h-4 w-4" />} label="Activity Log" />
            </>
          ) : null}
          <AdminSidebarLink href="/admin/orders" icon={<ShoppingBag className="h-4 w-4" />} label="Orders" />
          {me.isAdmin ? (
            <AdminSidebarLink href="/admin/catalog" icon={<Tags className="h-4 w-4" />} label="Store Catalog" />
          ) : null}
          <AdminSidebarLink
            href="/admin/chat-handoffs"
            icon={<MessageCircle className="h-4 w-4" />}
            label="Chat Handoffs"
            badge={handoffPending > 0 ? handoffPending : undefined}
          />
          <Link
            href="/portal/sites"
            className="mt-6 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to portal
          </Link>
        </nav>
        <div className="space-y-3 border-t border-slate-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Language
            </span>
            <LanguageToggle current={lang} />
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <div className="truncate font-medium text-slate-900">{me.name}</div>
            <div className="truncate text-slate-500">{me.email}</div>
            <LogoutButton className="mt-2 text-rose-600 hover:underline" />
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
