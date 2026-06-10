"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type CommandSource = {
  id: string;
  label: string;
  sub?: string;
  href: string;
  group?: string;
  icon?: ReactNode;
};

export function CommandPalette({ sources }: { sources: CommandSource[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // global open shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // body scroll lock + focus
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => {
      document.body.style.overflow = "";
      window.clearTimeout(id);
    };
  }, [open]);

  // reset state on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sources.slice(0, 50);
    return sources
      .filter((s) => {
        const hay = `${s.label} ${s.sub ?? ""} ${s.group ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [query, sources]);

  // clamp active index when results change
  useEffect(() => {
    setActive((a) => {
      if (results.length === 0) return 0;
      if (a >= results.length) return results.length - 1;
      return a;
    });
  }, [results]);

  // keep active item in view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-index="${active}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function navigate(item: CommandSource) {
    setOpen(false);
    router.push(item.href);
  }

  function onInputKey(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (results.length ? (a + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) =>
        results.length ? (a - 1 + results.length) % results.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[active];
      if (item) navigate(item);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search sites, tickets, pages…"
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            aria-label="Search"
          />
          <kbd className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline-block">
            Esc
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No matches.
            </div>
          ) : (
            results.map((item, i) => (
              <button
                key={item.id}
                type="button"
                data-cmd-index={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => navigate(item)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
                  i === active
                    ? "bg-brand-50 text-brand-900"
                    : "text-slate-700 hover:bg-slate-50",
                )}
              >
                {item.icon ? (
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      i === active
                        ? "bg-brand-100 text-brand-700"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {item.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.label}
                  </span>
                  {item.sub ? (
                    <span className="block truncate text-xs text-slate-500">
                      {item.sub}
                    </span>
                  ) : null}
                </span>
                {item.group ? (
                  <span className="hidden shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:inline-block">
                    {item.group}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded bg-white px-1 py-0.5 ring-1 ring-slate-200">
                ↑
              </kbd>
              <kbd className="ml-1 rounded bg-white px-1 py-0.5 ring-1 ring-slate-200">
                ↓
              </kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="rounded bg-white px-1 py-0.5 ring-1 ring-slate-200">
                ↵
              </kbd>{" "}
              open
            </span>
          </div>
          <span>
            <kbd className="rounded bg-white px-1 py-0.5 ring-1 ring-slate-200">
              Esc
            </kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );
}
