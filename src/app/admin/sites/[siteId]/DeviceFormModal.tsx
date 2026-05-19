"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

const DEVICE_TYPES = [
  "Router",
  "Switch",
  "Wi-Fi AP",
  "POS Terminal",
  "Payment Terminal",
  "Receipt Printer",
  "KDS",
  "CDS",
  "NVR",
  "CCTV Camera",
  "Alarm Panel",
  "Windows PC",
  "Server",
  "Android POS Device",
  "Phone Handset",
];
const STATUSES = ["Active", "Warning", "Offline", "In Support", "Not Monitored"];
const LIFECYCLES = [
  "Planned",
  "Supplied",
  "Staged",
  "Installed",
  "In Service",
  "Maintenance Due",
  "Replacement Recommended",
  "Retired",
];
const SERVICES: { key: string; label: string }[] = [
  { key: "network", label: "Network" },
  { key: "fourg_backup", label: "4G Backup" },
  { key: "voice", label: "Voice" },
  { key: "pos", label: "POS" },
  { key: "cctv", label: "CCTV" },
  { key: "endpoint", label: "Endpoint" },
  { key: "it_support", label: "IT Support" },
];

export interface DeviceDraft {
  id?: string;
  name: string;
  type: string;
  location: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: string;
  lifecycleStage: string;
  warrantyExpiry: string;
  serviceCoverage: string[];
  assetNumber: string;
}

export function DeviceFormModal({
  siteId,
  initial,
  onClose,
  onSaved,
}: {
  siteId: string;
  initial: DeviceDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState<DeviceDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initial.id;

  function patch<K extends keyof DeviceDraft>(key: K, v: DeviceDraft[K]) {
    setData((prev) => ({ ...prev, [key]: v }));
  }
  function toggle(key: string) {
    setData((prev) => ({
      ...prev,
      serviceCoverage: prev.serviceCoverage.includes(key)
        ? prev.serviceCoverage.filter((x) => x !== key)
        : [...prev.serviceCoverage, key],
    }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const url = isEdit
        ? `/api/admin/sites/${siteId}/devices/${initial.id}`
        : `/api/admin/sites/${siteId}/devices`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Failed");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
      <form
        onSubmit={submit}
        className="my-8 w-full max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Edit device" : "Add device"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Device name *">
            <input
              required
              value={data.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="e.g. CBD Front-counter Router"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Type *">
            <select
              required
              value={data.type}
              onChange={(e) => patch("type", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {DEVICE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Location">
            <input
              value={data.location}
              onChange={(e) => patch("location", e.target.value)}
              placeholder="e.g. Comms cabinet"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Asset number (optional)">
            <input
              value={data.assetNumber}
              onChange={(e) => patch("assetNumber", e.target.value)}
              placeholder="auto-generated if blank"
              className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
            />
          </Field>
          <Field label="Brand">
            <input
              value={data.brand}
              onChange={(e) => patch("brand", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Model">
            <input
              value={data.model}
              onChange={(e) => patch("model", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Serial number">
            <input
              value={data.serialNumber}
              onChange={(e) => patch("serialNumber", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Warranty expiry">
            <input
              type="date"
              value={data.warrantyExpiry}
              onChange={(e) => patch("warrantyExpiry", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Status">
            <select
              value={data.status}
              onChange={(e) => patch("status", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Lifecycle stage">
            <select
              value={data.lifecycleStage}
              onChange={(e) => patch("lifecycleStage", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {LIFECYCLES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Service coverage">
          <div className="flex flex-wrap gap-1.5">
            {SERVICES.map((s) => {
              const on = data.serviceCoverage.includes(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggle(s.key)}
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
            {busy ? (isEdit ? "Saving…" : "Adding…") : isEdit ? "Save" : "Add device"}
          </button>
        </div>
      </form>
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
