"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { AddressAutocomplete } from "@/components/admin/AddressAutocomplete";

const SERVICES: { key: string; label: string }[] = [
  { key: "network", label: "Network" },
  { key: "fourg_backup", label: "4G Backup" },
  { key: "voice", label: "Voice" },
  { key: "pos", label: "POS & Payments" },
  { key: "cctv", label: "CCTV & Alarm" },
  { key: "endpoint", label: "Endpoint" },
  { key: "it_support", label: "IT Support" },
  { key: "microsoft", label: "Microsoft" },
  { key: "projects", label: "Projects" },
];

const STATES = ["VIC", "NSW", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export function NewSiteButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        <Plus className="h-4 w-4" /> New site
      </button>
      {open ? <NewSiteModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function NewSiteModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [state, setState] = useState("VIC");
  const [address, setAddress] = useState("");
  const [services, setServices] = useState<string[]>([
    "network",
    "voice",
    "pos",
  ]);
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("Site Manager");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleService(s: string) {
    setServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          state,
          address,
          servicesCovered: services,
          contactName,
          contactRole,
          contactPhone,
          contactEmail,
          notes,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Failed");
        return;
      }
      onClose();
      router.refresh();
      router.push(`/admin/sites/${j.site.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
      <form
        onSubmit={submit}
        className="my-12 w-full max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">New site</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Site name *">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Melbourne CBD Store"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="State *">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Address *" wide>
            <AddressAutocomplete
              required
              value={address}
              onChange={setAddress}
              placeholder="Start typing — Google suggests"
            />
          </Field>
        </div>

        <Field label="Services covered">
          <div className="flex flex-wrap gap-1.5">
            {SERVICES.map((s) => {
              const on = services.includes(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleService(s.key)}
                  className={
                    "rounded-full px-3 py-1 text-xs font-medium transition " +
                    (on
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </Field>

        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-2 text-xs font-medium text-slate-700">
            Main site contact
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Name *">
              <input
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Role">
              <input
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Phone">
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
          </div>
        </fieldset>

        <Field label="Notes (optional)">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>

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
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create site"}
          </button>
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
