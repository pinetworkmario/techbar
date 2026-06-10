"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  ArrowLeft,
  Building2,
  LifeBuoy,
  Menu,
  MessageCircle,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface TechMobileNavItem {
  href: string;
  label: string;
  iconName: string;
}

const ICONS: Record<string, LucideIcon> = {
  Building2,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
  ArrowLeft,
  Activity,
  Wrench,
};

export function TechMobileNav({
  items,
  userName,
  userEmail,
}: {
  items: TechMobileNavItem[];
  userName?: string;
  userEmail?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-slate-800/60"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-72 flex-col border-r border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/50">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    OPS CENTER
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-400">
                    PI Network
                  </div>
                </div>
              </div>
              <button
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-800/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 px-3 py-4">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = ICONS[item.iconName] ?? Building2;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition " +
                      (active
                        ? "bg-cyan-500/20 text-cyan-100"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100")
                    }
                  >
                    <Icon className="h-4 w-4 text-slate-400" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            {userName ? (
              <div className="border-t border-slate-800 p-4 text-xs text-slate-400">
                <div className="font-medium text-slate-100">{userName}</div>
                <div className="truncate">{userEmail}</div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
