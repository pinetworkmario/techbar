import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Wrench,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/portal/LogoutButton";
import { TechSidebarLink } from "./TechSidebarLink";

export default async function TechLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/tech/sites");
  if (!me.isAdmin && !me.isTech) redirect("/portal/sites");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-sky-500 text-white shadow-soft">
            <Wrench className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight text-slate-900">
              PI Network
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Tech Support
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3 text-sm">
          <TechSidebarLink
            href="/tech/sites"
            icon={<Building2 className="h-4 w-4" />}
            label="Sites"
          />
          <TechSidebarLink
            href="/tech/tickets"
            icon={<LifeBuoy className="h-4 w-4" />}
            label="Tickets"
          />
          <TechSidebarLink
            href="/tech/handoffs"
            icon={<MessageCircle className="h-4 w-4" />}
            label="Chat Handoffs"
          />
          {me.isAdmin ? (
            <Link
              href="/admin"
              className="mt-6 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Admin console
            </Link>
          ) : null}
          <Link
            href="/portal/sites"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Customer view
          </Link>
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <div className="truncate font-medium text-slate-900">{me.name}</div>
            <div className="truncate text-slate-500">{me.email}</div>
            <LogoutButton className="mt-2 text-rose-600 hover:underline" />
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
