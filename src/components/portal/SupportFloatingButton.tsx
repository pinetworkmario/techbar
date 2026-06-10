"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, PhoneCall, Ticket, X } from "lucide-react";
import { t, type Lang } from "@/lib/i18n";

export function SupportFloatingButton({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!popoverRef.current) return;
      if (e.target instanceof Node && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function openChat() {
    setOpen(false);
    // SiteChat listens for this event and opens its panel.
    window.dispatchEvent(new CustomEvent("pi:open-site-chat"));
  }

  return (
    <div
      ref={popoverRef}
      className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-3"
    >
      {open ? (
        <div className="w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl ring-1 ring-black/5">
          <div className="flex items-center justify-between px-1 pb-2">
            <div className="text-sm font-semibold text-slate-900">
              {t(lang, "common.requestHelp")}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={openChat}
              className="flex w-full items-center gap-3 rounded-xl bg-brand-50 px-3 py-3 text-left text-sm font-medium text-brand-900 hover:bg-brand-100"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-white shadow">
                <MessageCircle className="h-4 w-4" />
              </span>
              <span>
                <span className="block">Open chat</span>
                <span className="block text-xs font-normal text-brand-800/70">
                  Ask a quick question
                </span>
              </span>
            </button>
            <Link
              href="/portal/tickets?create=1"
              className="flex w-full items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-white shadow">
                <Ticket className="h-4 w-4" />
              </span>
              <span>
                <span className="block">Open a ticket</span>
                <span className="block text-xs font-normal text-slate-500">
                  We'll get back within SLA
                </span>
              </span>
            </Link>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 px-5 py-3.5 text-base font-semibold text-white shadow-2xl ring-2 ring-white/40 transition hover:from-brand-600 hover:to-brand-700 hover:shadow-[0_10px_28px_rgba(15,161,138,0.45)] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300"
        aria-expanded={open}
      >
        <PhoneCall className="h-5 w-5" />
        {t(lang, "common.requestHelp")}
      </button>
    </div>
  );
}
