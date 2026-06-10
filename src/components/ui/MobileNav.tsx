"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: ReactNode;
};

export function MobileNav({
  items,
  brandSlot,
  tone = "light",
}: {
  items: Item[];
  brandSlot?: ReactNode;
  tone?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const dark = tone === "dark";
  const triggerCls = dark
    ? "bg-slate-900/80 text-slate-100 ring-1 ring-slate-700 hover:bg-slate-800"
    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50";
  const drawerCls = dark
    ? "bg-slate-950 text-slate-100 ring-1 ring-slate-800"
    : "bg-white text-slate-900 ring-1 ring-slate-200";
  const itemCls = dark
    ? "text-slate-200 hover:bg-slate-800"
    : "text-slate-700 hover:bg-slate-100";
  const closeBtnCls = dark
    ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
    : "text-slate-400 hover:bg-slate-100 hover:text-slate-700";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed left-3 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-xl shadow-soft lg:hidden",
          triggerCls,
        )}
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto p-4 shadow-2xl",
              drawerCls,
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="min-w-0">{brandSlot}</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={cn("rounded-lg p-1.5", closeBtnCls)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                    itemCls,
                  )}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center">
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
