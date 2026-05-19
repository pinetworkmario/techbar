"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AddressAutocomplete } from "@/components/admin/AddressAutocomplete";

const STATES = ["VIC", "NSW", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export function AddSiteButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [state, setState] = useState("VIC");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; name: string } | null>(
    null,
  );

  function reset() {
    setName("");
    setAddress("");
    setError(null);
    setCreated(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/account/sites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, state, address }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Failed to create site");
        return;
      }
      setCreated({ id: j.site.id, name: j.site.name });
      router.refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="primary">
        <Plus className="h-4 w-4" /> Add Site
      </Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setTimeout(reset, 200);
        }}
        title={created ? "Site added" : "Add a New Site"}
        description={
          created
            ? "You've been granted full access. PI Network will help you set up modules and add devices."
            : "Add a new location to your account. You'll be granted full access immediately."
        }
      >
        {created ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <div>
                <div className="font-semibold text-emerald-900">
                  {created.name}
                </div>
                <div className="text-[11px] text-emerald-800/80">
                  Now in your sites list. Open it to start configuring.
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  setTimeout(reset, 200);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setOpen(false);
                  // small delay so router.push fires after modal close anim
                  setTimeout(() => {
                    window.location.href = `/portal/sites/${created.id}`;
                  }, 100);
                }}
              >
                Open site
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Site name *">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g. "Geelong Westfield"'
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
              <Field label="State">
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
              <Field label="Address *">
                <AddressAutocomplete
                  required
                  value={address}
                  onChange={setAddress}
                  placeholder="Start typing — Google suggests"
                />
              </Field>
            </div>
            {error ? (
              <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}
            <p className="text-[11px] text-slate-500">
              Modules (Network / Voice / CCTV / POS / Endpoint) are
              configured by PI Network when this site goes live. Need a full
              fitout? Use{" "}
              <a
                href="/portal/projects"
                className="text-brand-600 hover:underline"
              >
                Projects
              </a>{" "}
              instead — that bundles new-site + install + scheduling.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !name.trim()}>
                {busy ? "Adding…" : "Add site"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
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
