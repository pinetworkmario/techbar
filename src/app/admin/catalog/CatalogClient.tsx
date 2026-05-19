"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ImagePlus,
  ImageUp,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  STOCK_STATUS_LABELS,
  type BillingPeriod,
  type CatalogCategory,
  type CatalogItem,
  type StockStatus,
} from "@/lib/catalog-types";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as CatalogCategory[];
const BILLING_OPTIONS: { key: BillingPeriod; label: string }[] = [
  { key: "one_off", label: "One-off" },
  { key: "monthly", label: "Per month" },
];
const STOCK_OPTIONS = Object.keys(STOCK_STATUS_LABELS) as StockStatus[];

const EMPTY: Omit<CatalogItem, "id"> = {
  sku: "",
  name: "",
  category: "network",
  description: "",
  priceAud: 0,
  billing: "one_off",
  siteScoped: true,
  active: true,
  brand: "",
  longDescription: "",
  stockStatus: "in_stock",
  leadTimeDays: undefined,
  featured: false,
  minQty: 1,
  maxQty: 100,
  tags: [],
};

export function CatalogClient({ initial }: { initial: CatalogItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<CatalogItem[]>(initial);
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CatalogCategory | "">("");
  const [editing, setEditing] = useState<CatalogItem | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const r = await fetch("/api/admin/catalog", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setItems(j.items || []);
  }

  async function save(input: Partial<CatalogItem> & { id?: string }) {
    setBusy(true);
    setError(null);
    try {
      const url = input.id
        ? `/api/admin/catalog/${input.id}`
        : "/api/admin/catalog";
      const r = await fetch(url, {
        method: input.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Save failed");
        return;
      }
      setEditing(null);
      await reload();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: CatalogItem) {
    await save({ id: item.id, active: !(item.active !== false) });
  }

  async function remove(item: CatalogItem) {
    if (!confirm(`Delete "${item.name}" (${item.sku})? This cannot be undone.`))
      return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/catalog/${item.id}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error || "Delete failed");
        return;
      }
      await reload();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return items.filter((i) => {
      if (categoryFilter && i.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
      );
    });
  }, [items, filter, categoryFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items) c[i.category] = (c[i.category] ?? 0) + 1;
    return c;
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name / SKU / description…"
            className="w-full rounded-md border border-slate-200 py-1.5 pl-7 pr-3 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as CatalogCategory | "")
          }
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]} ({counts[c] ?? 0})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> New Item
        </button>
      </div>

      {error ? (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Active</th>
              <th className="px-3 py-2 text-left font-medium">Image</th>
              <th className="px-3 py-2 text-left font-medium">SKU</th>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Category</th>
              <th className="px-3 py-2 text-right font-medium">Price (AUD)</th>
              <th className="px-3 py-2 text-left font-medium">Billing</th>
              <th className="px-3 py-2 text-left font-medium">Site-scoped</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-8 text-center text-sm text-slate-500"
                >
                  No items.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item.id}
                  className={
                    item.active === false ? "opacity-50" : "hover:bg-slate-50"
                  }
                >
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      disabled={busy}
                      className={
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 transition " +
                        (item.active !== false
                          ? "bg-emerald-100 text-emerald-800 ring-emerald-200 hover:bg-emerald-200"
                          : "bg-slate-100 text-slate-500 ring-slate-200 hover:bg-slate-200")
                      }
                    >
                      {item.active !== false ? "Active" : "Hidden"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-10 w-12 rounded border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-12 items-center justify-center rounded border border-dashed border-slate-200 text-[10px] text-slate-400">
                        no img
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-700">
                    {item.sku}
                    {item.featured ? (
                      <span
                        className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800"
                        title="Featured"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {item.description.slice(0, 100)}
                      {item.description.length > 100 ? "…" : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {CATEGORY_LABELS[item.category]}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    ${item.priceAud.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {item.billing === "monthly" ? "/ mo" : "one-off"}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-500">
                    {item.siteScoped ? "Yes" : "No"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <ItemEditModal
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={save}
          onChanged={() => {
            void reload();
            router.refresh();
          }}
          busy={busy}
        />
      ) : null}
    </div>
  );
}

function ItemEditModal({
  initial,
  onClose,
  onSave,
  busy,
  onChanged,
}: {
  initial: CatalogItem | null;
  onClose: () => void;
  onSave: (i: Partial<CatalogItem> & { id?: string }) => void;
  busy: boolean;
  onChanged: () => void;
}) {
  const [data, setData] = useState<Omit<CatalogItem, "id">>(
    initial
      ? {
          sku: initial.sku,
          name: initial.name,
          category: initial.category,
          description: initial.description,
          priceAud: initial.priceAud,
          billing: initial.billing,
          siteScoped: initial.siteScoped,
          active: initial.active !== false,
          brand: initial.brand ?? "",
          longDescription: initial.longDescription ?? "",
          stockStatus: initial.stockStatus ?? "in_stock",
          leadTimeDays: initial.leadTimeDays,
          featured: initial.featured ?? false,
          minQty: initial.minQty ?? 1,
          maxQty: initial.maxQty ?? 100,
          tags: initial.tags ?? [],
          imageUrl: initial.imageUrl,
          gallery: initial.gallery ?? [],
        }
      : { ...EMPTY },
  );
  const [tagInput, setTagInput] = useState("");
  const [imgBusy, setImgBusy] = useState(false);

  function patch<K extends keyof typeof data>(k: K, v: (typeof data)[K]) {
    setData((p) => ({ ...p, [k]: v }));
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (!initial) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setImgBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch(`/api/admin/catalog/${initial.id}/photo`, {
        method: "POST",
        body: fd,
      });
      const j = await r.json();
      if (r.ok && j.url) {
        patch("imageUrl", j.url);
        onChanged();
      }
    } finally {
      setImgBusy(false);
      e.target.value = "";
    }
  }
  async function deletePhoto() {
    if (!initial) return;
    if (!confirm("Remove primary image?")) return;
    setImgBusy(true);
    try {
      await fetch(`/api/admin/catalog/${initial.id}/photo`, {
        method: "DELETE",
      });
      patch("imageUrl", undefined);
      onChanged();
    } finally {
      setImgBusy(false);
    }
  }
  async function uploadGallery(e: React.ChangeEvent<HTMLInputElement>) {
    if (!initial) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setImgBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch(`/api/admin/catalog/${initial.id}/gallery`, {
        method: "POST",
        body: fd,
      });
      const j = await r.json();
      if (r.ok && Array.isArray(j.gallery)) {
        patch("gallery", j.gallery);
        onChanged();
      }
    } finally {
      setImgBusy(false);
      e.target.value = "";
    }
  }
  async function deleteGalleryItem(url: string) {
    if (!initial) return;
    setImgBusy(true);
    try {
      const r = await fetch(
        `/api/admin/catalog/${initial.id}/gallery?url=${encodeURIComponent(url)}`,
        { method: "DELETE" },
      );
      const j = await r.json();
      if (r.ok) {
        patch("gallery", j.gallery || []);
        onChanged();
      }
    } finally {
      setImgBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            {initial ? `Edit: ${initial.name}` : "New Catalog Item"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 overflow-y-auto px-4 py-3 sm:grid-cols-2">
          <Field label="SKU (leave blank to auto-generate)">
            <input
              value={data.sku}
              onChange={(e) => patch("sku", e.target.value)}
              placeholder="auto: N-4560 / P-6734 / C-2103 …"
              className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs uppercase"
            />
          </Field>
          <Field label="Name *">
            <input
              required
              value={data.name}
              onChange={(e) => patch("name", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Category">
            <select
              value={data.category}
              onChange={(e) =>
                patch("category", e.target.value as CatalogCategory)
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Billing">
            <select
              value={data.billing}
              onChange={(e) =>
                patch("billing", e.target.value as BillingPeriod)
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {BILLING_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Price (AUD)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.priceAud}
              onChange={(e) =>
                patch("priceAud", Number(e.target.value) || 0)
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Site-scoped">
            <div className="flex h-9 items-center gap-2">
              <input
                type="checkbox"
                checked={data.siteScoped}
                onChange={(e) => patch("siteScoped", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-600">
                Customer must pick a site when ordering
              </span>
            </div>
          </Field>
          <Field label="Active" wide>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.active !== false}
                onChange={(e) => patch("active", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-600">
                Visible in customer Store ({data.active !== false ? "yes" : "hidden"})
              </span>
            </div>
          </Field>
          <Field label="Brand">
            <input
              value={data.brand ?? ""}
              onChange={(e) => patch("brand", e.target.value)}
              placeholder="e.g. Yealink"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Stock status">
            <select
              value={data.stockStatus ?? "in_stock"}
              onChange={(e) => patch("stockStatus", e.target.value as StockStatus)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {STOCK_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STOCK_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lead time (days)">
            <input
              type="number"
              min={0}
              value={data.leadTimeDays ?? ""}
              onChange={(e) =>
                patch(
                  "leadTimeDays",
                  e.target.value === "" ? undefined : Number(e.target.value),
                )
              }
              placeholder="e.g. 5"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Featured">
            <div className="flex h-9 items-center gap-2">
              <input
                type="checkbox"
                checked={data.featured ?? false}
                onChange={(e) => patch("featured", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-600">
                Promote on Store landing
              </span>
            </div>
          </Field>
          <Field label="Min qty / order">
            <input
              type="number"
              min={1}
              value={data.minQty ?? 1}
              onChange={(e) => patch("minQty", Number(e.target.value) || 1)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Max qty / order">
            <input
              type="number"
              min={1}
              value={data.maxQty ?? 100}
              onChange={(e) => patch("maxQty", Number(e.target.value) || 100)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Tags (Enter to add)" wide>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1">
              {(data.tags ?? []).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() =>
                      patch(
                        "tags",
                        (data.tags ?? []).filter((x) => x !== t),
                      )
                    }
                    className="text-slate-500 hover:text-rose-600"
                    aria-label={`Remove ${t}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const v = tagInput.trim();
                    if (v && !(data.tags ?? []).includes(v))
                      patch("tags", [...(data.tags ?? []), v]);
                    setTagInput("");
                  } else if (
                    e.key === "Backspace" &&
                    !tagInput &&
                    (data.tags ?? []).length > 0
                  ) {
                    patch("tags", (data.tags ?? []).slice(0, -1));
                  }
                }}
                placeholder="add tag"
                className="min-w-[80px] flex-1 border-0 px-1 text-xs focus:outline-none focus:ring-0"
              />
            </div>
          </Field>
          <Field label="Short description (shown on cards)" wide>
            <textarea
              rows={2}
              value={data.description}
              onChange={(e) => patch("description", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Long description / specs (markdown, on detail page)" wide>
            <textarea
              rows={6}
              value={data.longDescription ?? ""}
              onChange={(e) => patch("longDescription", e.target.value)}
              placeholder="## Highlights\n- ..."
              className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
            />
          </Field>

          {initial ? (
            <div className="sm:col-span-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">
                  Images
                </span>
                <span className="text-[10px] text-slate-500">
                  Primary + up to 8 gallery photos · 5 MB each
                </span>
              </div>
              <div className="flex gap-3">
                <div className="relative h-28 w-32 overflow-hidden rounded-md border border-slate-200 bg-white">
                  {data.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                      no primary
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    className={
                      "inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium " +
                      (imgBusy
                        ? "cursor-wait bg-slate-100 text-slate-400"
                        : "bg-brand-600 text-white hover:bg-brand-700")
                    }
                  >
                    <ImageUp className="h-3.5 w-3.5" />
                    {data.imageUrl ? "Replace primary" : "Upload primary"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={imgBusy}
                      onChange={uploadPhoto}
                    />
                  </label>
                  {data.imageUrl ? (
                    <button
                      type="button"
                      onClick={deletePhoto}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">
                    Gallery ({(data.gallery ?? []).length}/8)
                  </span>
                  <label
                    className={
                      "inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium " +
                      (imgBusy || (data.gallery ?? []).length >= 8
                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                        : "bg-violet-600 text-white hover:bg-violet-700")
                    }
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Add photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={imgBusy || (data.gallery ?? []).length >= 8}
                      onChange={uploadGallery}
                    />
                  </label>
                </div>
                {(data.gallery ?? []).length === 0 ? (
                  <p className="text-[11px] text-slate-500">No extra photos.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(data.gallery ?? []).map((url) => (
                      <div
                        key={url}
                        className="relative h-16 w-20 overflow-hidden rounded-md border border-slate-200 bg-white"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => deleteGalleryItem(url)}
                          className="absolute right-0.5 top-0.5 rounded-full bg-rose-600/90 p-0.5 text-white shadow hover:bg-rose-700"
                          aria-label="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="sm:col-span-2 rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              Save the item first, then re-open it to upload images.
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                ...(initial ? { id: initial.id } : {}),
                ...data,
              })
            }
            disabled={busy || !data.name.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {initial ? "Save Changes" : "Create Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={"block " + (wide ? "sm:col-span-2" : "")}>
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
