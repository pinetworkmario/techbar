"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  FileText,
  Pencil,
  Plus,
  Save,
  Trash2,
  Video,
  X,
} from "lucide-react";
import type { HelpArticle } from "@/lib/types";

const CATEGORIES: HelpArticle["category"][] = [
  "Network",
  "POS & Payments",
  "CCTV & Alarm",
  "Voice",
  "IT Support",
  "Portal Guide",
];
const FORMATS: HelpArticle["format"][] = ["Article", "Video"];

const EMPTY: Omit<HelpArticle, "id"> = {
  title: "",
  category: "Portal Guide",
  estimatedMinutes: 5,
  appliesTo: "",
  format: "Article",
  bodyMarkdown: "",
  videoUrl: "",
};

export function HelpArticlesClient({ initial }: { initial: HelpArticle[] }) {
  const router = useRouter();
  const [items, setItems] = useState<HelpArticle[]>(initial);
  const [editing, setEditing] = useState<HelpArticle | "new" | null>(null);
  const [filter, setFilter] = useState<HelpArticle["category"] | "All">("All");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const r = await fetch("/api/admin/help-articles", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setItems(j.articles || []);
  }
  async function save(input: Partial<HelpArticle> & { id?: string }) {
    setBusy(true);
    setError(null);
    try {
      const url = input.id
        ? `/api/admin/help-articles/${input.id}`
        : "/api/admin/help-articles";
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
  async function remove(a: HelpArticle) {
    if (!confirm(`Delete "${a.title}"?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/help-articles/${a.id}`, { method: "DELETE" });
      await reload();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: items.length };
    for (const a of items) c[a.category] = (c[a.category] ?? 0) + 1;
    return c;
  }, [items]);
  const filtered =
    filter === "All" ? items : items.filter((a) => a.category === filter);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...CATEGORIES] as const).map((c) => {
            const on = filter === c;
            return (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={
                  "rounded-full px-3 py-1 text-xs font-medium transition " +
                  (on
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                }
              >
                {c} ({counts[c] ?? 0})
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="ml-auto inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> New Article
        </button>
      </div>

      {error ? (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No articles in this category.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.format === "Video" ? (
                      <Video className="h-4 w-4 text-rose-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-brand-600" />
                    )}
                    <span className="font-semibold text-slate-900">
                      {a.title}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                      {a.category}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ~{a.estimatedMinutes} min
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Applies to: {a.appliesTo}
                  </p>
                  {a.bodyMarkdown ? (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                      {a.bodyMarkdown.slice(0, 220)}
                      {a.bodyMarkdown.length > 220 ? "…" : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] italic text-slate-400">
                      (no body — metadata only)
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(a)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <Modal
          initial={editing === "new" ? null : editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      ) : null}
    </div>
  );
}

function Modal({
  initial,
  busy,
  onClose,
  onSave,
}: {
  initial: HelpArticle | null;
  busy: boolean;
  onClose: () => void;
  onSave: (i: Partial<HelpArticle> & { id?: string }) => void;
}) {
  const [data, setData] = useState<Omit<HelpArticle, "id">>(
    initial
      ? {
          title: initial.title,
          category: initial.category,
          estimatedMinutes: initial.estimatedMinutes,
          appliesTo: initial.appliesTo,
          format: initial.format,
          bodyMarkdown: initial.bodyMarkdown ?? "",
          videoUrl: initial.videoUrl ?? "",
        }
      : { ...EMPTY },
  );
  function patch<K extends keyof typeof data>(k: K, v: (typeof data)[K]) {
    setData((p) => ({ ...p, [k]: v }));
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            {initial ? `Edit: ${initial.title}` : "New Help Article"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 overflow-y-auto px-4 py-3 sm:grid-cols-2">
          <Field label="Title *" wide>
            <input
              required
              value={data.title}
              onChange={(e) => patch("title", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Category">
            <select
              value={data.category}
              onChange={(e) =>
                patch("category", e.target.value as HelpArticle["category"])
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Format">
            <select
              value={data.format}
              onChange={(e) =>
                patch("format", e.target.value as HelpArticle["format"])
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {FORMATS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Estimated minutes">
            <input
              type="number"
              min={0}
              value={data.estimatedMinutes}
              onChange={(e) =>
                patch("estimatedMinutes", Number(e.target.value) || 0)
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Applies to">
            <input
              value={data.appliesTo}
              onChange={(e) => patch("appliesTo", e.target.value)}
              placeholder='e.g. "Network & Internet"'
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          {data.format === "Video" ? (
            <Field label="Video URL" wide>
              <input
                value={data.videoUrl}
                onChange={(e) => patch("videoUrl", e.target.value)}
                placeholder="https://…"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
          ) : null}
          <Field label="Body (markdown)" wide>
            <textarea
              rows={10}
              value={data.bodyMarkdown}
              onChange={(e) => patch("bodyMarkdown", e.target.value)}
              placeholder='# Heading

Paragraph. **Bold**. *Italic*.

- bullet
- bullet

```bash
example command
```'
              className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
            />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
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
            disabled={busy || !data.title.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {initial ? "Save" : "Create"}
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
