"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CreditCard, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface PaymentCard {
  id: string;
  userId: string;
  brand: "Visa" | "Mastercard" | "Amex" | "Other";
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderName: string;
  isDefault: boolean;
  autopay: boolean;
  addedAt: string;
}

const BRANDS: PaymentCard["brand"][] = ["Visa", "Mastercard", "Amex", "Other"];

export function PaymentMethodsCard() {
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/account/cards");
      if (r.ok) {
        const j = await r.json();
        setCards(j.cards || []);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function patch(id: string, payload: Record<string, unknown>) {
    setError(null);
    const r = await fetch(`/api/account/cards/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j.error || "Failed");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this payment method?")) return;
    const r = await fetch(`/api/account/cards/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j.error || "Failed");
      return;
    }
    await load();
  }

  return (
    <Card>
      <CardHeader
        title="Payment methods"
        subtitle="Bind a card for invoice auto-pay. PI Network stores only the last 4 digits and a tokenised reference."
        action={
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add card
          </Button>
        }
      />
      <CardBody className="space-y-3">
        {error ? (
          <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : cards.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
            No cards on file. Add one to enable invoice auto-pay.
          </div>
        ) : (
          <ul className="space-y-2">
            {cards.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-12 place-items-center rounded-md bg-slate-100 text-xs font-semibold text-slate-700">
                    {c.brand === "Visa"
                      ? "VISA"
                      : c.brand === "Mastercard"
                        ? "MC"
                        : c.brand === "Amex"
                          ? "AMEX"
                          : "CARD"}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {c.brand} ····{" "}
                      <span className="font-mono">{c.last4}</span>
                      {c.isDefault ? (
                        <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-700">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.cardholderName} · expires{" "}
                      {String(c.expMonth).padStart(2, "0")}/
                      {String(c.expYear).slice(-2)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={c.autopay}
                      onChange={(e) =>
                        patch(c.id, { autopay: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    Auto-pay
                  </label>
                  {!c.isDefault ? (
                    <button
                      type="button"
                      onClick={() => patch(c.id, { isDefault: true })}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Set default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>
            Card binding here registers the last 4 digits and a tokenised
            reference for billing. Full payment details (PAN, CVV) are captured
            separately by PI Network's PCI-compliant payment gateway, never on
            this portal.
          </span>
        </div>
      </CardBody>

      {adding ? (
        <AddCardModal
          onClose={() => setAdding(false)}
          onAdded={async () => {
            setAdding(false);
            await load();
          }}
        />
      ) : null}
    </Card>
  );
}

function AddCardModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [brand, setBrand] = useState<PaymentCard["brand"]>("Visa");
  const [last4, setLast4] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [autopay, setAutopay] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/account/cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brand,
          last4,
          expMonth: Number(expMonth),
          expYear: Number(expYear),
          cardholderName,
          autopay,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Failed");
        return;
      }
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
      <form
        onSubmit={submit}
        className="my-12 w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            <CreditCard className="mr-1 inline h-5 w-5" />
            Add payment method
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Enter only the last 4 digits of your card. PI Network's finance team
          will follow up via the secure PCI-compliant payment gateway to
          capture the full card details and complete enrolment.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Brand">
            <select
              value={brand}
              onChange={(e) =>
                setBrand(e.target.value as PaymentCard["brand"])
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {BRANDS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="Last 4 digits">
            <input
              required
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))}
              placeholder="1234"
              className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
            />
          </Field>
          <Field label="Cardholder name" wide>
            <input
              required
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Expiry month">
            <input
              required
              inputMode="numeric"
              maxLength={2}
              value={expMonth}
              onChange={(e) =>
                setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))
              }
              placeholder="MM"
              className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
            />
          </Field>
          <Field label="Expiry year">
            <input
              required
              inputMode="numeric"
              maxLength={4}
              value={expYear}
              onChange={(e) =>
                setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="YYYY"
              className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autopay}
            onChange={(e) => setAutopay(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Enable auto-pay for invoices charged to this card
        </label>

        {error ? (
          <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save card"}
          </Button>
        </div>
      </form>
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
