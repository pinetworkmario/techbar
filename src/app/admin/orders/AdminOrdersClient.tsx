"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CATEGORY_LABELS, type Order, type OrderStatus } from "@/lib/catalog-types";

const STATUSES: OrderStatus[] = [
  "Pending",
  "Quoted",
  "Approved",
  "Completed",
  "Rejected",
];

function fmtAud(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function AdminOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/orders");
    const j = await r.json();
    setOrders(j.orders || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const visible =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500">
          Customer order requests submitted from the Store. Update status as
          you process them.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All ({orders.length})
        </FilterChip>
        {STATUSES.map((s) => (
          <FilterChip
            key={s}
            active={filter === s}
            onClick={() => setFilter(s)}
          >
            {s} ({orders.filter((o) => o.status === s).length})
          </FilterChip>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2" />
              <th className="px-3 py-2">Order #</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Submitted</th>
              <th className="px-3 py-2">Lines</th>
              <th className="px-3 py-2">One-off</th>
              <th className="px-3 py-2">Monthly</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  No orders match.
                </td>
              </tr>
            ) : (
              visible.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  expanded={expanded === o.id}
                  onToggle={() =>
                    setExpanded((p) => (p === o.id ? null : o.id))
                  }
                  onChanged={load}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrderRow({
  order,
  expanded,
  onToggle,
  onChanged,
}: {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [adminNote, setAdminNote] = useState(order.adminNote ?? "");
  const [busy, setBusy] = useState(false);

  async function patch(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr className="hover:bg-slate-50/60">
        <td className="px-2 py-2">
          <button
            type="button"
            onClick={onToggle}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-3 py-2 font-mono text-xs">{order.number}</td>
        <td className="px-3 py-2">
          <div className="text-sm font-medium text-slate-900">
            {order.userName}
          </div>
          <div className="text-xs text-slate-500">{order.userEmail}</div>
        </td>
        <td className="px-3 py-2 text-xs text-slate-600">
          {new Date(order.createdAt).toLocaleString()}
        </td>
        <td className="px-3 py-2 text-xs">{order.lines.length}</td>
        <td className="px-3 py-2 text-xs">{fmtAud(order.oneOffSubtotalAud)}</td>
        <td className="px-3 py-2 text-xs">
          {fmtAud(order.monthlySubtotalAud)} /mo
        </td>
        <td className="px-3 py-2">
          <StatusBadge status={order.status} />
        </td>
      </tr>
      {expanded ? (
        <tr className="bg-slate-50/40">
          <td colSpan={8} className="px-4 py-4">
            <div className="space-y-3">
              {order.customerNote ? (
                <div className="rounded-md bg-white p-3 text-sm ring-1 ring-slate-200">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">
                    Customer note
                  </div>
                  <div className="mt-1 text-slate-700">{order.customerNote}</div>
                </div>
              ) : null}
              <div className="overflow-hidden rounded-md ring-1 ring-slate-200">
                <table className="min-w-full divide-y divide-slate-100 bg-white text-xs">
                  <thead className="bg-slate-50 text-left uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-1.5">SKU</th>
                      <th className="px-3 py-1.5">Item</th>
                      <th className="px-3 py-1.5">Category</th>
                      <th className="px-3 py-1.5">Site</th>
                      <th className="px-3 py-1.5">Qty</th>
                      <th className="px-3 py-1.5">Price</th>
                      <th className="px-3 py-1.5">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.lines.map((l, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 font-mono">{l.sku}</td>
                        <td className="px-3 py-1.5">{l.name}</td>
                        <td className="px-3 py-1.5">
                          {CATEGORY_LABELS[l.category]}
                        </td>
                        <td className="px-3 py-1.5">{l.siteName ?? "—"}</td>
                        <td className="px-3 py-1.5">{l.qty}</td>
                        <td className="px-3 py-1.5">
                          {fmtAud(l.priceAud)}
                          {l.billing === "monthly" ? " /mo" : ""}
                        </td>
                        <td className="px-3 py-1.5 font-medium">
                          {fmtAud(l.priceAud * l.qty)}
                          {l.billing === "monthly" ? " /mo" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="block text-xs">
                  <span className="text-slate-500">Internal admin note</span>
                  <textarea
                    rows={2}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patch({ adminNote })}
                  className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  Save note
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Mark as:</span>
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy || order.status === s}
                    onClick={() => patch({ status: s })}
                    className={
                      "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset disabled:opacity-50 " +
                      (order.status === s
                        ? "bg-slate-200 text-slate-700 ring-slate-300"
                        : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-3 py-1 text-xs font-medium transition " +
        (active
          ? "bg-brand-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200")
      }
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const cls: Record<OrderStatus, string> = {
    Pending: "bg-amber-50 text-amber-700 ring-amber-200",
    Quoted: "bg-sky-50 text-sky-700 ring-sky-200",
    Approved: "bg-brand-50 text-brand-700 ring-brand-200",
    Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset " +
        cls[status]
      }
    >
      {status}
    </span>
  );
}
