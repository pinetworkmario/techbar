"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Package,
  Plus,
  Search,
  Sparkles,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  CATEGORY_LABELS,
  STOCK_STATUS_LABELS,
  type CatalogCategory,
  type CatalogItem,
  type Order,
  type StockStatus,
} from "@/lib/catalog-types";

const STOCK_TONE: Record<StockStatus, string> = {
  in_stock: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  low_stock: "bg-amber-100 text-amber-800 ring-amber-200",
  out_of_stock: "bg-rose-100 text-rose-800 ring-rose-200",
  made_to_order: "bg-sky-100 text-sky-800 ring-sky-200",
};

interface SiteOption {
  id: string;
  name: string;
}

interface CartLine {
  itemId: string;
  qty: number;
  siteId?: string;
}

const ALL_CATEGORIES: CatalogCategory[] = [
  "network",
  "voice",
  "pos",
  "cctv",
  "endpoint",
  "it_support",
  "materials",
];

function fmtAud(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function StoreClient({
  items,
  sites,
}: {
  items: CatalogItem[];
  sites: SiteOption[];
}) {
  const [cat, setCat] = useState<CatalogCategory | "all">("all");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Order[]>([]);
  const [showCart, setShowCart] = useState(false);

  async function loadRecent() {
    try {
      const r = await fetch("/api/account/orders");
      if (r.ok) {
        const j = await r.json();
        setRecent((j.orders || []).slice(0, 10));
      }
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    loadRecent();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (!term) return true;
      return (
        i.sku.toLowerCase().includes(term) ||
        i.name.toLowerCase().includes(term) ||
        (i.brand ?? "").toLowerCase().includes(term) ||
        i.description.toLowerCase().includes(term) ||
        (i.tags ?? []).some((t) => t.toLowerCase().includes(term))
      );
    });
  }, [items, cat, q]);
  const featured = useMemo(() => items.filter((i) => i.featured), [items]);

  function addToCart(itemId: string) {
    setCart((prev) => {
      const found = prev.find((l) => l.itemId === itemId && !l.siteId);
      if (found)
        return prev.map((l) =>
          l === found ? { ...l, qty: l.qty + 1 } : l,
        );
      return [...prev, { itemId, qty: 1 }];
    });
  }
  function removeLine(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }
  function setQty(idx: number, qty: number) {
    setCart((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, qty: Math.max(1, Math.floor(qty)) } : l,
      ),
    );
  }
  function setSite(idx: number, siteId: string) {
    setCart((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, siteId } : l)),
    );
  }

  const cartLineDetails = cart.map((l) => {
    const item = items.find((i) => i.id === l.itemId);
    return { line: l, item };
  });
  const oneOff = cartLineDetails.reduce(
    (s, x) =>
      s + (x.item && x.item.billing === "one_off" ? x.item.priceAud * x.line.qty : 0),
    0,
  );
  const monthly = cartLineDetails.reduce(
    (s, x) =>
      s + (x.item && x.item.billing === "monthly" ? x.item.priceAud * x.line.qty : 0),
    0,
  );
  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  async function submit() {
    setError(null);
    // Validate site selections
    for (const { line, item } of cartLineDetails) {
      if (item?.siteScoped && !line.siteId) {
        setError(`Choose a site for "${item.name}".`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/account/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: cart.map((l) => ({
            itemId: l.itemId,
            qty: l.qty,
            siteId: l.siteId,
          })),
          customerNote: note,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Failed");
        return;
      }
      setCart([]);
      setNote("");
      setShowCart(false);
      await loadRecent();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store"
        description="Order new services, hardware and materials. Submission creates a request — your account manager will confirm pricing and schedule delivery."
        actions={
          <button
            type="button"
            onClick={() => setShowCart(true)}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
            {cartCount > 0 ? (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">
                {cartCount}
              </span>
            ) : null}
          </button>
        }
      />

      {/* Featured row */}
      {cat === "all" && !q.trim() && featured.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
            <Sparkles className="h-4 w-4" />
            Featured
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 3).map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onAdd={() => addToCart(item.id)}
                accent
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Search + Category filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by SKU, name, brand…"
            className="w-full rounded-md border border-slate-200 py-2 pl-8 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={cat === "all"} onClick={() => setCat("all")}>
            All ({items.length})
          </FilterChip>
          {ALL_CATEGORIES.map((c) => {
            const n = items.filter((i) => i.category === c).length;
            if (n === 0) return null;
            return (
              <FilterChip key={c} active={cat === c} onClick={() => setCat(c)}>
                {CATEGORY_LABELS[c]} ({n})
              </FilterChip>
            );
          })}
        </div>
        {q ? (
          <span className="ml-auto text-[11px] text-slate-500">
            {filtered.length} match{filtered.length === 1 ? "" : "es"}
          </span>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          {q ? (
            <>
              No products match <span className="font-mono">{`"${q}"`}</span>.
              Try a partial SKU, brand, or product name.
            </>
          ) : (
            "No products in this category."
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              onAdd={() => addToCart(item.id)}
            />
          ))}
        </div>
      )}

      {recent.length > 0 ? (
        <Card>
          <CardHeader title="My recent orders" />
          <CardBody className="overflow-x-auto p-0">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2">Order #</th>
                  <th className="px-4 py-2">Submitted</th>
                  <th className="px-4 py-2">Lines</th>
                  <th className="px-4 py-2">One-off</th>
                  <th className="px-4 py-2">Monthly</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-2 font-mono text-xs">{o.number}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-xs">{o.lines.length}</td>
                    <td className="px-4 py-2 text-xs">
                      {fmtAud(o.oneOffSubtotalAud)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {fmtAud(o.monthlySubtotalAud)}
                    </td>
                    <td className="px-4 py-2">
                      <OrderStatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : null}

      {showCart ? (
        <CartDrawer
          cartLineDetails={cartLineDetails}
          sites={sites}
          oneOff={oneOff}
          monthly={monthly}
          note={note}
          setNote={setNote}
          submitting={submitting}
          error={error}
          onClose={() => setShowCart(false)}
          onRemove={removeLine}
          onQty={setQty}
          onSite={setSite}
          onSubmit={submit}
        />
      ) : null}
    </div>
  );
}

function CartDrawer({
  cartLineDetails,
  sites,
  oneOff,
  monthly,
  note,
  setNote,
  submitting,
  error,
  onClose,
  onRemove,
  onQty,
  onSite,
  onSubmit,
}: {
  cartLineDetails: { line: CartLine; item: CatalogItem | undefined }[];
  sites: SiteOption[];
  oneOff: number;
  monthly: number;
  note: string;
  setNote: (v: string) => void;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onRemove: (idx: number) => void;
  onQty: (idx: number, qty: number) => void;
  onSite: (idx: number, siteId: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="text-base font-semibold text-slate-900">
            <ShoppingCart className="mr-1 inline h-4 w-4" />
            Cart ({cartLineDetails.length} line{cartLineDetails.length === 1 ? "" : "s"})
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {cartLineDetails.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Cart is empty. Click <span className="font-medium">Add</span> on
              an item to start an order.
            </div>
          ) : (
            <ul className="space-y-3">
              {cartLineDetails.map((x, idx) => (
                <li
                  key={idx}
                  className="rounded-md border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {x.item?.name ?? "(unknown item)"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        <span className="font-mono">{x.item?.sku}</span> ·{" "}
                        {x.item ? fmtAud(x.item.priceAud) : "—"}{" "}
                        {x.item?.billing === "monthly" ? "/mo" : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(idx)}
                      className="rounded p-1 text-rose-500 hover:bg-rose-50"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="block text-xs">
                      <span className="text-slate-500">Quantity</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={x.line.qty}
                        onChange={(e) => onQty(idx, Number(e.target.value))}
                        className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                      />
                    </label>
                    {x.item?.siteScoped ? (
                      <label className="block text-xs">
                        <span className="text-slate-500">Deliver to site</span>
                        <select
                          value={x.line.siteId ?? ""}
                          onChange={(e) => onSite(idx, e.target.value)}
                          className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                        >
                          <option value="">— pick site —</option>
                          {sites.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="text-xs text-slate-400">
                        No site needed (account-wide)
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {cartLineDetails.length > 0 ? (
            <label className="mt-4 block text-xs">
              <span className="text-slate-500">
                Notes for your account manager (optional)
              </span>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Preferred install date, special instructions, etc."
                className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
              />
            </label>
          ) : null}
        </div>
        {cartLineDetails.length > 0 ? (
          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">
                  One-off subtotal
                </div>
                <div className="text-base font-semibold text-slate-900">
                  {fmtAud(oneOff)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">
                  Monthly subtotal
                </div>
                <div className="text-base font-semibold text-slate-900">
                  {fmtAud(monthly)} / mo
                </div>
              </div>
            </div>
            <p className="mb-2 text-[11px] text-slate-500">
              Submission creates a request. PI Network will confirm pricing,
              materials availability and schedule before delivery.
            </p>
            {error ? (
              <div className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}
            <Button
              onClick={onSubmit}
              disabled={submitting}
              className="w-full"
            >
              <Check className="h-4 w-4" />
              {submitting ? "Submitting…" : "Submit order request"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
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

function OrderStatusBadge({ status }: { status: Order["status"] }) {
  const cls: Record<Order["status"], string> = {
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


function ProductCard({
  item,
  onAdd,
  accent,
}: {
  item: CatalogItem;
  onAdd: () => void;
  accent?: boolean;
}) {
  const stock = item.stockStatus;
  const out = stock === "out_of_stock";
  return (
    <div
      className={
        "flex flex-col overflow-hidden rounded-lg border bg-white transition hover:shadow-md " +
        (accent
          ? "border-amber-300 ring-1 ring-amber-200"
          : "border-slate-200")
      }
    >
      <Link
        href={`/portal/store/${item.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-slate-100"
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className={
              "h-full w-full object-cover transition group-hover:scale-105 " +
              (out ? "opacity-50" : "")
            }
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Package className="h-12 w-12" />
          </div>
        )}
        {item.featured && !accent ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            <Sparkles className="h-3 w-3" /> Featured
          </span>
        ) : null}
        {stock ? (
          <span
            className={
              "absolute right-2 top-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 " +
              STOCK_TONE[stock]
            }
          >
            {STOCK_STATUS_LABELS[stock]}
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
          <span className="truncate">
            {CATEGORY_LABELS[item.category]}
            {item.brand ? <span> · {item.brand}</span> : null}
          </span>
          <span
            className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] tracking-normal text-slate-700"
            title={`SKU ${item.sku}`}
          >
            {item.sku}
          </span>
        </div>
        <Link
          href={`/portal/store/${item.id}`}
          className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-900 hover:text-brand-700"
        >
          {item.name}
        </Link>
        <p className="mt-1 line-clamp-2 text-xs text-slate-600">
          {item.description}
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
          <div>
            <div className="text-base font-semibold text-slate-900">
              {fmtAud(item.priceAud)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              {item.billing === "monthly" ? "per month" : "one-off"}
              {item.siteScoped ? " · per site" : ""}
              {item.leadTimeDays
                ? ` · ${item.leadTimeDays}d lead`
                : ""}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Button size="sm" onClick={onAdd} disabled={out}>
              <Plus className="h-4 w-4" /> Add
            </Button>
            <Link
              href={`/portal/store/${item.id}`}
              className="inline-flex items-center justify-end gap-0.5 text-[11px] text-brand-600 hover:underline"
            >
              Details <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

