"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TechSidebarLink({
  href,
  icon,
  label,
  exact,
  badge,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  exact?: boolean;
  badge?: string | number;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  const wrapCls = active
    ? "bg-cyan-500/20 text-cyan-100 border-l-2 border-cyan-400"
    : "border-l-2 border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-100";
  const iconCls = active
    ? "bg-slate-900 text-cyan-300 ring-1 ring-cyan-400/50 shadow-glow-cyan"
    : "bg-slate-800/70 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-200";
  return (
    <Link
      href={href}
      className={
        "group flex items-center gap-3 rounded-r-xl pl-3 pr-2 py-2 text-sm font-medium transition " +
        wrapCls
      }
    >
      <span
        className={
          "grid h-9 w-9 shrink-0 place-items-center rounded-full transition " +
          iconCls
        }
      >
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge !== null && badge !== "" && badge !== 0 ? (
        <span
          className={
            "ml-auto rounded-md px-1.5 py-0.5 font-mono text-[10px] " +
            (active
              ? "bg-cyan-400/30 text-cyan-100"
              : "bg-slate-800 text-slate-400 group-hover:text-slate-200")
          }
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
