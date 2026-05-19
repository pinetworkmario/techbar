"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { ReferralActivity, ReferralProgram } from "@/lib/types";

const STATUSES: ReferralActivity["status"][] = [
  "Invited",
  "Contacted",
  "Purchased",
  "Credit Applied",
];
const STATUS_TONE: Record<ReferralActivity["status"], string> = {
  Invited: "bg-slate-100 text-slate-700 ring-slate-200",
  Contacted: "bg-sky-100 text-sky-800 ring-sky-200",
  Purchased: "bg-amber-100 text-amber-800 ring-amber-200",
  "Credit Applied": "bg-emerald-100 text-emerald-800 ring-emerald-200",
};

export function ReferralClient({ initial }: { initial: ReferralProgram }) {
  const router = useRouter();
  const [program, setProgram] = useState<ReferralProgram>(initial);
  const [editing, setEditing] = useState<ReferralActivity | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // local form state for the meta block
  const [metaCode, setMetaCode] = useState(initial.code);
  const [metaLink, setMetaLink] = useState(initial.link);
  const [credit, setCredit] = useState(initial.credit);

  async function reload() {
    const r = await fetch("/api/admin/referral", { cache: "no-store" });
    const j = await r.json();
    if (r.ok && j.program) {
      setProgram(j.program);
      setMetaCode(j.program.code);
      setMetaLink(j.program.link);
      setCredit(j.program.credit);
    }
  }

  async function saveMeta() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/referral", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: metaCode, link: metaLink, credit }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error || "Save failed");
        return;
      }
      await reload();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveActivity(input: Partial<ReferralActivity> & { id?: string }) {
    setBusy(true);
    setError(null);
    try {
      const url = input.id
        ? `/api/admin/referral/activity/${input.id}`
        : "/api/admin/referral/activity";
      const r = await fetch(url, {
        method: input.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
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

  async function removeActivity(a: ReferralActivity) {
    if (!confirm(`Delete referral for "${a.referredBusiness}"?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/referral/activity/${a.id}`, { method: "DELETE" });
      await reload();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-2 text-sm font-bold text-slate-900">
          Program metadata
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Promo code">
            <input
              value={metaCode}
              onChange={(e) => setMetaCode(e.target.value)}
              placeholder="PINETWORK-MATE"
              className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm uppercase"
            />
          </Field>
          <Field label="Share link">
            <input
              value={metaLink}
              onChange={(e) => setMetaLink(e.target.value)}
              placeholder="https://pinetwork.com.au/refer/..."
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Available credit (AUD)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={credit.available}
              onChange={(e) =>
                setCredit({
                  ...credit,
                  available: Number(e.target.value) || 0,
                })
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Pending credit (AUD)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={credit.pending}
              onChange={(e) =>
                setCredit({ ...credit, pending: Number(e.target.value) || 0 })
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Used credit (AUD)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={credit.used}
              onChange={(e) =>
                setCredit({ ...credit, used: Number(e.target.value) || 0 })
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Next invoice credit (AUD)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={credit.nextInvoiceCredit}
              onChange={(e) =>
                setCredit({
                  ...credit,
                  nextInvoiceCredit: Number(e.target.value) || 0,
                })
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={saveMeta}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? (
              <Save className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save metadata
          </button>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-2 text-sm font-bold text-slate-900">
          Referral activity ({program.activity.length})
        </legend>
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> New referral
          </button>
        </div>
        {program.activity.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No referrals yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200">
            {program.activity.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm"
              >
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 " +
                    STATUS_TONE[a.status]
                  }
                >
                  {a.status}
                </span>
                <span className="font-medium text-slate-900">
                  {a.referredBusiness}
                </span>
                <span className="text-xs text-slate-500">
                  {a.eligibleService || "(no service)"}
                </span>
                <span className="ml-auto font-mono text-xs text-slate-700">
                  ${a.creditAmount.toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-500">{a.date}</span>
                <button
                  type="button"
                  onClick={() => setEditing(a)}
                  disabled={busy}
                  className="rounded-md bg-white p-1 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeActivity(a)}
                  disabled={busy}
                  className="rounded-md bg-white p-1 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {editing ? (
        <ActivityModal
          initial={editing === "new" ? null : editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={saveActivity}
        />
      ) : null}
    </div>
  );
}

function ActivityModal({
  initial,
  busy,
  onClose,
  onSave,
}: {
  initial: ReferralActivity | null;
  busy: boolean;
  onClose: () => void;
  onSave: (i: Partial<ReferralActivity> & { id?: string }) => void;
}) {
  const [referredBusiness, setRB] = useState(initial?.referredBusiness ?? "");
  const [eligibleService, setES] = useState(initial?.eligibleService ?? "");
  const [creditAmount, setCA] = useState(initial?.creditAmount ?? 0);
  const [status, setStatus] = useState<ReferralActivity["status"]>(
    initial?.status ?? "Invited",
  );
  const [date, setDate] = useState(
    (initial?.date ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
  );
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            {initial ? "Edit referral" : "New referral"}
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
        <div className="grid gap-3 px-4 py-3">
          <Field label="Referred business *">
            <input
              required
              value={referredBusiness}
              onChange={(e) => setRB(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Eligible service">
            <input
              value={eligibleService}
              onChange={(e) => setES(e.target.value)}
              placeholder='e.g. "Endpoint Support"'
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status">
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as ReferralActivity["status"])
                }
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Credit amount (AUD)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={creditAmount}
                onChange={(e) => setCA(Number(e.target.value) || 0)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
          </div>
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
                referredBusiness,
                eligibleService,
                creditAmount,
                status,
                date,
              })
            }
            disabled={busy || !referredBusiness.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
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
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
