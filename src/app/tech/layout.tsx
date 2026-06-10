import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  Building2,
  Wrench,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { sites, tickets } from "@/lib/data";
import { pendingCount } from "@/lib/chat-handoffs";
import { LogoutButton } from "@/components/portal/LogoutButton";
import { CommandPalette, type CommandSource } from "@/components/CommandPalette";
import { TechSidebarLink } from "./TechSidebarLink";
import { TechMobileNav, type TechMobileNavItem } from "./TechMobileNav";

export default async function TechLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/tech/sites");
  if (!me.isAdmin && !me.isTech) redirect("/portal/sites");

  // Status bar metrics — computed server-side.
  const totalSites = sites.length;
  const criticalSites = sites.filter((s) => s.health === "Critical").length;
  const sitesOnline = sites.filter((s) => s.health !== "Critical").length;
  const openTicketsCount = tickets.filter(
    (t) => t.status !== "Resolved" && t.status !== "Closed",
  ).length;
  const pendingHandoffs = pendingCount();

  // Command palette sources: nav + every site.
  const navSources: CommandSource[] = [
    { id: "nav-dash", label: "Dashboard", sub: "Ops overview", href: "/tech", group: "Nav" },
    { id: "nav-sites", label: "All sites", sub: "Site explorer", href: "/tech/sites", group: "Nav" },
    { id: "nav-tickets", label: "Tickets", sub: "All open tickets", href: "/tech/tickets", group: "Nav" },
    { id: "nav-handoffs", label: "Chat handoffs", sub: "Customers waiting", href: "/tech/handoffs", group: "Nav" },
  ];
  if (me.isAdmin) {
    navSources.push({
      id: "nav-admin",
      label: "Admin console",
      sub: "Full admin",
      href: "/admin",
      group: "Nav",
    });
  }
  const siteSources: CommandSource[] = sites.map((s) => ({
    id: `site-${s.id}`,
    label: s.name,
    sub: `${s.state} · ${s.address}`,
    href: `/tech/sites/${s.id}`,
    group: "Sites",
  }));
  const commandSources: CommandSource[] = [...navSources, ...siteSources];

  const mobileNavItems: TechMobileNavItem[] = [
    { href: "/tech", label: "Dashboard", iconName: "Activity" },
    { href: "/tech/sites", label: "Sites", iconName: "Building2" },
    { href: "/tech/tickets", label: "Tickets", iconName: "LifeBuoy" },
    { href: "/tech/handoffs", label: "Chat Handoffs", iconName: "MessageCircle" },
  ];
  if (me.isAdmin) {
    mobileNavItems.push({ href: "/admin", label: "Admin console", iconName: "ShieldCheck" });
  }
  mobileNavItems.push({ href: "/portal/sites", label: "Customer view", iconName: "ArrowLeft" });

  return (
    <div
      data-shell="tech"
      className="dark min-h-screen bg-slate-950 text-slate-100"
      style={{
        background:
          "linear-gradient(180deg, #050a18 0%, #0a1632 50%, #050a18 100%)",
      }}
    >
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/80 backdrop-blur lg:flex">
          <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/50 shadow-glow-cyan">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-400">
                  Ops Center
                </span>
              </div>
              <div className="text-sm font-semibold leading-tight text-slate-100">
                PI Network
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3 text-sm">
            <TechSidebarLink
              href="/tech"
              exact
              icon={<Activity className="h-4 w-4" />}
              label="Dashboard"
            />
            <TechSidebarLink
              href="/tech/sites"
              icon={<Building2 className="h-4 w-4" />}
              label="Sites"
              badge={totalSites}
            />
            <TechSidebarLink
              href="/tech/tickets"
              icon={<LifeBuoy className="h-4 w-4" />}
              label="Tickets"
              badge={openTicketsCount}
            />
            <TechSidebarLink
              href="/tech/handoffs"
              icon={<MessageCircle className="h-4 w-4" />}
              label="Chat Handoffs"
              badge={pendingHandoffs}
            />
            {me.isAdmin ? (
              <Link
                href="/admin"
                className="mt-6 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Admin console
              </Link>
            ) : null}
            <Link
              href="/portal/sites"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Customer view
            </Link>
          </nav>
          <div className="border-t border-slate-800 p-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
              <div className="truncate font-medium text-slate-100">{me.name}</div>
              <div className="truncate text-slate-500">{me.email}</div>
              <LogoutButton className="mt-2 text-rose-400 hover:underline" />
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2 lg:px-8">
              <TechMobileNav
                items={mobileNavItems}
                userName={me.name}
                userEmail={me.email}
              />
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-400">
                  Ops Center
                </span>
              </div>
              <div className="ml-2 hidden items-center gap-4 text-[11px] sm:flex">
                <span className="text-slate-400">
                  Sites online:{" "}
                  <span className="font-mono font-semibold text-emerald-400">
                    {sitesOnline}/{totalSites}
                  </span>
                </span>
                <span className="text-slate-400">
                  Active outages:{" "}
                  <span
                    className={
                      "font-mono font-semibold " +
                      (criticalSites > 0 ? "text-rose-400" : "text-slate-300")
                    }
                  >
                    {criticalSites}
                  </span>
                </span>
                <span className="text-slate-400">
                  Open tickets:{" "}
                  <span
                    className={
                      "font-mono font-semibold " +
                      (openTicketsCount > 0 ? "text-amber-300" : "text-slate-300")
                    }
                  >
                    {openTicketsCount}
                  </span>
                </span>
                <span className="text-slate-400">
                  Handoffs:{" "}
                  <span
                    className={
                      "font-mono font-semibold " +
                      (pendingHandoffs > 0 ? "text-cyan-300" : "text-slate-300")
                    }
                  >
                    {pendingHandoffs}
                  </span>
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-400">
                <span className="hidden sm:inline">Search</span>
                <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                  Cmd
                </kbd>
                <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                  K
                </kbd>
              </div>
            </div>
          </div>
          <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette sources={commandSources} />
    </div>
  );
}
