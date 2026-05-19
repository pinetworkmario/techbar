"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

interface Notif {
  id: string;
  kind: string;
  text: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/account/notifications?limit=30");
      if (r.ok) {
        const j = await r.json();
        setItems(j.notifications || []);
        setUnread(j.unread || 0);
      }
    } finally {
      setLoading(false);
    }
  }

  // Poll every 60s when not open; on open, fetch fresh.
  useEffect(() => {
    if (open) {
      void load();
      return;
    }
    const t = setInterval(() => {
      fetch("/api/account/notifications?limit=1")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j) setUnread(j.unread || 0);
        })
        .catch(() => undefined);
    }, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!popRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/account/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  return (
    <div ref={popRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Notifications
            </span>
            {items.length > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-3 py-6 text-center text-xs text-slate-500">
                Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-500">
                No notifications. We'll buzz you when ticket status changes or
                PI Network replies.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => {
                  const body = (
                    <div
                      className={
                        "block px-3 py-2 transition hover:bg-slate-50 " +
                        (n.read ? "opacity-60" : "")
                      }
                    >
                      <div className="flex items-start gap-2">
                        {!n.read ? (
                          <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                        ) : (
                          <span className="mt-1.5 inline-block h-2 w-2 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-slate-800">{n.text}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link href={n.link} onClick={() => setOpen(false)}>
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
