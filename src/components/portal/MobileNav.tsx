"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Network, X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Building2,
  Ticket,
  CalendarRange,
  Hammer,
  GraduationCap,
  UserCircle,
  ShoppingBag,
} from "lucide-react";
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

interface NavUser {
  name: string;
  email: string;
  isAdmin: boolean;
  isContactManager: boolean;
}

export function MobileNav({ user }: { user?: NavUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
                  <Network className="h-4 w-4" />
                </div>
                <div className="text-sm font-semibold">PI Network</div>
              </div>
              <button
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 px-3 py-4">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <Icon className="h-4 w-4 text-slate-400" />
                    {item.label}
                  </Link>
                );
              })}
              {user?.isAdmin ? (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  <ShieldCheck className="h-4 w-4 text-brand-600" />
                  Admin
                </Link>
              ) : null}
            </nav>
            {user ? (
              <div className="border-t border-slate-200 p-4 text-xs text-slate-600">
                <div className="font-medium text-slate-900">{user.name}</div>
                <div className="text-slate-500">{user.email}</div>
                <LogoutButton className="mt-2 text-rose-600 hover:underline" />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
