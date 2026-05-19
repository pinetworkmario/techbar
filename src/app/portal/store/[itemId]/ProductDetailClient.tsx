"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Clock,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  CATEGORY_LABELS,
  STOCK_STATUS_LABELS,
  type CatalogItem,
  type StockStatus,
} from "@/lib/catalog-types";

const STOCK_TONE: Record<StockStatus, string> = {
  in_stock: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  low_stock: "bg-amber-100 text-amber-800 ring-amber-200",
  out_of_stock: "bg-rose-100 text-rose-800 ring-rose-200",
  made_to_order: "bg-sky-100 text-sky-800 ring-sky-200",
};

interface SiteOpt {
  id: string;
  name: string;
}

function fmtAud(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function ProductDetailClient({
  item,
  sites,
}: {
  item: CatalogItem;
  sites: SiteOpt[];
}) {
  const allPhotos = [
    ...(item.imageUrl ? [item.imageUrl] : []),
    ...(item.gallery ?? []),
  ];
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(item.minQty ?? 1);
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderedRef, setOrderedRef] = useState<string | null>(null);

  const out = item.stockStatus === "out_of_stock";
  const max = item.maxQty ?? 100;
  const min = item.minQty ?? 1;

  async function order() {
    setError(null);
    if (item.siteScoped && !siteId) {
      setError("Pick a site first.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/account/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: [
            {
              itemId: item.id,
              qty,
              siteId: item.siteScoped ? siteId : undefined,
            },
          ],
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Order failed");
        return;
      }
      setOrderedRef(j.order?.number ?? "PI-O-?");
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      {/* Left: image + long description */}
      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="relative aspect-[4/3] bg-slate-100">
            {allPhotos.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={allPhotos[active]}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <Package className="h-20 w-20" />
              </div>
            )}
            {item.featured ? (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow">
                <Sparkles className="h-3 w-3" /> Featured
              </span>
            ) : null}
            {item.stockStatus ? (
              <span
                className={
                  "absolute right-3 top-3 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 " +
                  STOCK_TONE[item.stockStatus]
                }
              >
                {STOCK_STATUS_LABELS[item.stockStatus]}
              </span>
            ) : null}
          </div>
          {allPhotos.length > 1 ? (
            <div className="flex gap-1.5 overflow-x-auto bg-slate-50 px-2 py-2">
              {allPhotos.map((url, i) => (
                <button
                  key={url + i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={
                    "h-14 w-20 shrink-0 overflow-hidden rounded border-2 transition " +
                    (i === active
                      ? "border-brand-600"
                      : "border-transparent opacity-70 hover:opacity-100")
                  }
                  aria-label={`Photo ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {item.longDescription ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Details
            </h2>
            <div className="prose prose-slate prose-sm max-w-none">
              <ReactMarkdown>{item.longDescription}</ReactMarkdown>
            </div>
          </div>
        ) : null}
      </div>

      {/* Right: header + price + add to cart */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {CATEGORY_LABELS[item.category]}
            {item.brand ? <> · {item.brand}</> : null}
            {" · "}
            <span className="font-mono">{item.sku}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{item.name}</h1>
          <p className="text-sm text-slate-600">{item.description}</p>
        </div>

        {item.tags && item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-bold text-slate-900">
                {fmtAud(item.priceAud)}
              </div>
              <div className="text-xs uppercase tracking-wider text-slate-500">
                {item.billing === "monthly" ? "per month" : "one-off"}
                {item.siteScoped ? " · per site" : ""}
              </div>
            </div>
            {item.leadTimeDays ? (
              <div className="text-right text-xs text-slate-600">
                <Clock className="mr-1 inline h-3.5 w-3.5" />
                {item.leadTimeDays} day lead time
              </div>
            ) : null}
          </div>

          {orderedRef ? (
            <div className="mt-4 rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Order created:{" "}
                <span className="font-mono">{orderedRef}</span>
              </div>
              <p className="mt-1 text-xs text-emerald-800/80">
                A team member will follow up. View it any time on your{" "}
                <Link href="/portal/store" className="underline">
                  Store page
                </Link>{" "}
                under recent orders.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-3">
                {item.siteScoped ? (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-700">
                      Site
                    </span>
                    <select
                      value={siteId}
                      onChange={(e) => setSiteId(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    >
                      {sites.length === 0 ? (
                        <option value="">— no accessible site —</option>
                      ) : null}
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <div>
                  <span className="mb-1 block text-xs font-medium text-slate-700">
                    Quantity
                  </span>
                  <div className="inline-flex items-center rounded-md border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(min, q - 1))}
                      disabled={qty <= min}
                      className="flex h-9 w-9 items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      aria-label="Decrease"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={min}
                      max={max}
                      value={qty}
                      onChange={(e) => {
                        const n = Number(e.target.value) || min;
                        setQty(Math.max(min, Math.min(max, n)));
                      }}
                      className="h-9 w-14 border-0 bg-transparent text-center text-sm focus:outline-none focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(max, q + 1))}
                      disabled={qty >= max}
                      className="flex h-9 w-9 items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      aria-label="Increase"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="ml-2 text-[11px] text-slate-500">
                    Min {min} · Max {max}
                  </span>
                </div>
              </div>

              {error ? (
                <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="button"
                disabled={out || submitting || (item.siteScoped && !siteId)}
                onClick={order}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" />
                {submitting
                  ? "Placing order…"
                  : out
                    ? "Out of stock"
                    : `Order ${qty} × ${fmtAud(item.priceAud * qty)}`}
              </button>
              <p className="mt-2 text-[10px] text-slate-500">
                Submitting creates an order request — your account manager
                confirms pricing + schedules delivery. A ticket is auto-routed
                to the responsible team.
              </p>
            </>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600">
          <div className="mb-1 inline-flex items-center gap-1 font-semibold text-slate-700">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            Why order through the portal
          </div>
          <ul className="space-y-1 pl-5 [list-style:disc]">
            <li>Bundled into your monthly invoice</li>
            <li>Eligible for support pack discounts</li>
            <li>Tracked end-to-end on your Orders + Tickets pages</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
