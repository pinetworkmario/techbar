"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Ticket,
  CalendarRange,
  Hammer,
  GraduationCap,
  UserCircle,
  Network,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/portal/LogoutButton";

const NAV = [
  { href: "/portal/sites", label: "My Sites", icon: Building2 },
  { href: "/portal/tickets", label: "Support Tickets", icon: Ticket },
  {
    href: "/portal/lifecycle",
    label: "Lifecycle & Maintenance",
    icon: CalendarRange,
  },
  { href: "/portal/projects", label: "Projects", icon: Hammer },
  { href: "/portal/store", label: "Store", icon: ShoppingBag },
  { href: "/portal/help", label: "Help & Training", icon: GraduationCap },
  { href: "/portal/account", label: "My Account", icon: UserCircle },
];

interface SidebarUser {
  name: string;
  email: string;
  isAdmin: boolean;
  isContactManager: boolean;
}

export function PortalSidebar({ user }: { user?: SidebarUser }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-white shadow-soft">
          <Network className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight text-slate-900">
            PI Network
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
            Business Portal
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand-50 text-brand-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full transition",
                  active
                    ? "bg-brand-500 text-white shadow-soft"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
        {user?.isAdmin ? (
          <Link
            href="/admin"
            className={cn(
              "mt-5 flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium",
              pathname.startsWith("/admin")
                ? "bg-brand-50 text-brand-800"
                : "text-brand-700 hover:bg-brand-50",
            )}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
              <ShieldCheck className="h-4 w-4" />
            </span>
            Admin Console
          </Link>
        ) : null}
      </nav>
      <div className="border-t border-slate-200 p-4">
        {user ? (
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <div className="truncate font-medium text-slate-900">
              {user.name}
            </div>
            <div className="truncate text-slate-500">{user.email}</div>
            <LogoutButton className="mt-2 text-rose-600 hover:underline" />
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <div className="font-medium text-slate-900">Need help?</div>
            <div className="mt-1">
              24×7 support · <span className="font-medium">1300 PINETWORK</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
