"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TechSidebarLink({
  href,
  icon,
  label,
  exact,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  const cls = active
    ? "bg-sky-50 text-sky-800"
    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";
  const iconCls = active
    ? "bg-sky-500 text-white shadow-soft"
    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200";
  return (
    <Link
      href={href}
      className={
        "group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition " +
        cls
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
      <span className="flex-1">{label}</span>
    </Link>
  );
}
