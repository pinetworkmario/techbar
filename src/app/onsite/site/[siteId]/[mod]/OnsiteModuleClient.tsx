"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Sparkles,
} from "lucide-react";

interface DeviceCard {
  id: string;
  name: string;
  type: string;
  location: string;
  status: string;
  asset: string;
  photoUrl: string;
}

interface OpenTicket {
  id: string;
  number: string;
  status: string;
  issueType: string;
  createdAt: string;
  latestUpdate: string;
}

const IMPACTS = [
  { key: "No major impact", label: "Just FYI", tone: "text-slate-300" },
  { key: "Partially impacted", label: "Working but slow", tone: "text-amber-300" },
  { key: "Cannot take payments", label: "Can't take payments", tone: "text-rose-300" },
  { key: "Cannot trade", label: "Can't trade — store stopped", tone: "text-rose-400" },
  { key: "Security risk", label: "Security risk", tone: "text-rose-400" },
] as const;

const STATUS_TONE: Record<string, string> = {
  Active: "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]",
  Warning: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]",
  Offline: "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]",
  "In Support": "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]",
  "Not Monitored": "bg-slate-500",
};

export function OnsiteModuleClient({
  siteId,
  siteName,
  mod,
  modLabel,
  ticketCategory,
  devices,
  openTickets,
}: {
  siteId: string;
  siteName: string;
  mod: string;
  modLabel: string;
  ticketCategory: string;
  devices: DeviceCard[];
  openTickets: OpenTicket[];
}) {
  type Step = "home" | "impact" | "describe" | "done";
  const [step, setStep] = useState<Step>("home");
  const [selected, setSelected] = useState<DeviceCard | null>(null);
  const [impact, setImpact] = useState<(typeof IMPACTS)[number]["key"]>(
    "Partially impacted",
  );
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneRef, setDoneRef] = useState<string | null>(null);

  function startFromDevice(d: DeviceCard) {
    setSelected(d);
    setStep("impact");
  }
  function startGeneral() {
    setSelected(null);
    setStep("impact");
  }
  function backHome() {
    setStep("home");
    setSelected(null);
    setDesc("");
    setDoneRef(null);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const deviceOrService = selected
        ? `${selected.name} (${selected.asset})`
        : `${modLabel} — onsite report`;
      const issueType = selected
        ? `${selected.type} issue`
        : ticketCategory;
      const r = await fetch(`/api/account/sites/${siteId}/tickets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deviceOrService,
          issueType,
          businessImpact: impact,
          description:
            desc ||
            (selected
              ? `Reported via onsite iPad. Device: ${selected.name} @ ${selected.location || "(no location)"}.`
              : `Reported via onsite iPad. Module: ${modLabel} (no specific device identified).`),
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Failed to send");
        return;
      }
      setDoneRef(j.ticket?.number ?? "PI-?");
      setStep("done");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <div className="mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 ring-1 ring-emerald-500/20">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-7 w-7 text-emerald-300" />
          <div>
            <div className="text-lg font-bold text-emerald-50">
              We're on it
            </div>
            <div className="text-sm text-emerald-200/80">
              Ticket{" "}
              <span className="font-mono">{doneRef}</span> raised — team
              auto-paged.
              {selected ? (
                <span className="ml-1 text-emerald-200/60">
                  ({selected.name})
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={backHome}
          className="mt-4 w-full rounded-xl bg-slate-100/10 px-4 py-3 text-sm font-medium hover:bg-slate-100/20"
        >
          Back to {modLabel}
        </button>
      </div>
    );
  }

  if (step === "impact") {
    return (
      <div className="mt-6 space-y-3">
        {selected ? (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-3 text-sm">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              Reporting
            </span>
            <div className="font-semibold">{selected.name}</div>
            <div className="text-xs text-slate-400">
              {selected.type}
              {selected.location ? ` · ${selected.location}` : ""}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-3 text-sm text-slate-300">
            General {modLabel} issue — not sure which device.
          </div>
        )}
        <h2 className="text-lg font-semibold">How bad is it?</h2>
        <div className="grid gap-2">
          {IMPACTS.map((i) => (
            <button
              key={i.key}
              type="button"
              onClick={() => {
                setImpact(i.key);
                setStep("describe");
              }}
              className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4 text-left transition hover:border-sky-500/40 hover:bg-slate-800/60 active:scale-[0.98]"
            >
              <span className={"text-base font-semibold " + i.tone}>
                {i.label}
              </span>
              <ChevronRight className="h-5 w-5 text-slate-500" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={backHome}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (step === "describe") {
    return (
      <div className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold">Anything to add? (optional)</h2>
        <p className="text-xs text-slate-400">
          A quick description helps the team — but you can also skip and we'll
          phone the site contact.
        </p>
        <textarea
          rows={5}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          autoFocus
          placeholder={
            selected
              ? `e.g. "Light flashing red since 5pm — won't connect to network."`
              : `e.g. "Internet very slow throughout the store since lunch."`
          }
          className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none"
        />
        {error ? (
          <div className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-200 ring-1 ring-rose-500/30">
            {error}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setStep("impact")}
            disabled={busy}
            className="rounded-2xl border border-slate-700 px-4 py-4 text-sm font-medium text-slate-300 hover:bg-slate-900"
          >
            Back
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-2xl bg-sky-500 px-4 py-4 text-base font-semibold text-white shadow-[0_0_24px_rgba(56,189,248,0.35)] hover:bg-sky-400 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send to PI Network"}
          </button>
        </div>
      </div>
    );
  }

  // home step
  return (
    <div className="mt-6 space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            {devices.length > 0
              ? `Your ${modLabel} devices (${devices.length})`
              : `${modLabel} devices`}
          </h3>
        </div>
        {devices.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4 text-sm text-slate-400">
            No {modLabel.toLowerCase()} devices on file at this site yet. Use
            the general report below.
          </div>
        ) : (
          <ul className="grid gap-2">
            {devices.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => startFromDevice(d)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/50 p-3 text-left transition hover:border-sky-500/40 hover:bg-slate-800/60 active:scale-[0.99]"
                >
                  <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.photoUrl}
                      alt={d.name}
                      className="h-full w-full object-cover opacity-90"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          "h-2 w-2 shrink-0 rounded-full " +
                          (STATUS_TONE[d.status] || "bg-slate-500")
                        }
                      />
                      <span className="truncate text-sm font-semibold text-white">
                        {d.name}
                      </span>
                    </div>
                    <div className="truncate text-[11px] text-slate-400">
                      {d.type}
                      {d.location ? ` · ${d.location}` : ""}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {d.asset}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <button
          type="button"
          onClick={startGeneral}
          className="group block w-full rounded-3xl border border-sky-500/40 bg-gradient-to-br from-sky-500/20 to-cyan-500/10 p-5 text-left transition hover:from-sky-500/30 hover:shadow-[0_0_30px_rgba(56,189,248,0.25)] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-500/30 p-3">
              <Sparkles className="h-6 w-6 text-sky-100" />
            </div>
            <div>
              <div className="text-base font-bold text-white">
                Not sure which device?
              </div>
              <div className="text-xs text-sky-200/80">
                Raise a general {modLabel} ticket — we'll figure it out.
              </div>
            </div>
          </div>
        </button>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Open tickets ({openTickets.length})
          </h3>
        </div>
        {openTickets.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4 text-sm text-slate-400">
            Nothing open here right now — looking clean.
          </div>
        ) : (
          <ul className="space-y-2">
            {openTickets.map((t) => (
              <li
                key={t.id}
                className="rounded-2xl border border-slate-800/70 bg-slate-900/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-400">
                    {t.number}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-300 ring-1 ring-amber-500/30">
                    <AlertTriangle className="h-3 w-3" />
                    {t.status}
                  </span>
                </div>
                <div className="mt-1 text-sm font-medium">{t.issueType}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {t.latestUpdate}
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="h-3 w-3" />
                  {new Date(t.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
