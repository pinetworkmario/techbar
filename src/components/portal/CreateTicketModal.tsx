"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { BusinessImpact } from "@/lib/types";

interface SiteOption { id: string; name: string }

const IMPACTS: BusinessImpact[] = [
  "No major impact",
  "Partially impacted",
  "Cannot take payments",
  "Cannot trade",
  "Security risk",
];

const ISSUE_CATEGORIES = [
  "Network / Internet",
  "Voice / Phone",
  "POS Terminal",
  "Payment Terminal",
  "CCTV / Alarm",
  "Endpoint / Computer",
  "Microsoft 365",
  "Other / Not sure",
];

/** Map ticket issue category → KB article category for the "Maybe this
 * helps first?" panel. */
const KB_CATEGORY_BY_ISSUE: Record<string, string> = {
  "Network / Internet": "Network",
  "Voice / Phone": "Voice",
  "POS Terminal": "POS & Payments",
  "Payment Terminal": "POS & Payments",
  "CCTV / Alarm": "CCTV & Alarm",
  "Endpoint / Computer": "IT Support",
  "Microsoft 365": "IT Support",
  "Other / Not sure": "Portal Guide",
};

interface KbArticle {
  id: string;
  title: string;
  estimatedMinutes: number;
  format: "Article" | "Video";
  appliesTo: string;
}

export function CreateTicketModal({
  open,
  onClose,
  defaultSiteId,
  defaultDevice,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  defaultSiteId?: string;
  defaultDevice?: string;
  onSubmitted?: (ticketNumber: string) => void;
}) {
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [siteId, setSiteId] = useState(defaultSiteId ?? "");

  useEffect(() => {
    if (!open) return;
    fetch("/api/account/sites")
      .then((r) => r.json())
      .then((j) => {
        const list: SiteOption[] = j.sites || [];
        setSites(list);
        setSiteId((cur) => cur || defaultSiteId || list[0]?.id || "");
      })
      .catch(() => setSites([]));
  }, [open, defaultSiteId]);
  const [deviceOrService, setDeviceOrService] = useState(defaultDevice ?? "");
  const [category, setCategory] = useState(ISSUE_CATEGORIES[0]);
  const [impact, setImpact] = useState<BusinessImpact>("No major impact");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactMethod, setContactMethod] = useState("Email");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [kbHits, setKbHits] = useState<KbArticle[]>([]);

  // Fetch KB articles matching the current issue category. Throttled by
  // category change only.
  useEffect(() => {
    if (!open) return;
    const kbCat = KB_CATEGORY_BY_ISSUE[category];
    if (!kbCat) {
      setKbHits([]);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/account/help-articles?category=${encodeURIComponent(kbCat)}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((j) => setKbHits((j.articles || []).slice(0, 3)))
      .catch(() => {
        /* ignore */
      });
    return () => ctrl.abort();
  }, [open, category]);

  function reset() {
    setSubmitted(null);
    setSubmitError(null);
    setDescription("");
    setDeviceOrService(defaultDevice ?? "");
    setSiteId(defaultSiteId ?? sites[0]?.id ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!siteId) {
      setSubmitError("Pick a site");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await fetch(`/api/account/sites/${siteId}/tickets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deviceOrService,
          issueType: category,
          businessImpact: impact,
          description,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setSubmitError(j.error || "Failed to create ticket");
        return;
      }
      const number = j.ticket?.number ?? "PI-?";
      setSubmitted(number);
      onSubmitted?.(number);
    } catch (e) {
      setSubmitError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        // small delay so the success view doesn't flash on close
        setTimeout(reset, 200);
      }}
      title={submitted ? "Ticket created" : "Create Support Ticket"}
      description={
        submitted
          ? undefined
          : "PiNetwork will triage this ticket and respond within your support level."
      }
      size="lg"
    >
      {submitted ? (
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <div className="font-semibold">
                Your support ticket has been created.
              </div>
              <div className="mt-1">
                Ticket <span className="font-mono">{submitted}</span> — all
                updates will be tracked in this portal.
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                reset();
              }}
            >
              Create another
            </Button>
            <Button
              onClick={() => {
                onClose();
                setTimeout(reset, 200);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Site">
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className={INPUT}
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Device or service">
              <input
                value={deviceOrService}
                onChange={(e) => setDeviceOrService(e.target.value)}
                placeholder="e.g. POS Terminal at counter 2"
                className={INPUT}
                required
              />
            </Field>
            <Field label="Issue category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={INPUT}
              >
                {ISSUE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Business impact">
              <select
                value={impact}
                onChange={(e) => setImpact(e.target.value as BusinessImpact)}
                className={INPUT}
              >
                {IMPACTS.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </Field>
          </div>

          {kbHits.length > 0 ? (
            <div className="rounded-md border border-sky-200 bg-sky-50 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                Maybe this helps first?
              </div>
              <ul className="space-y-1">
                {kbHits.map((a) => (
                  <li key={a.id}>
                    <a
                      href="/portal/help"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-2 rounded px-2 py-1 text-xs text-sky-900 hover:bg-sky-100"
                    >
                      <span className="mt-0.5 rounded bg-sky-200/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-900">
                        {a.format}
                      </span>
                      <span className="flex-1">
                        <span className="font-medium">{a.title}</span>
                        <span className="ml-1 text-[10px] text-sky-700/80">
                          ~{a.estimatedMinutes} min
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[10px] text-sky-700/70">
                If this doesn't fix it, keep filling out the ticket below.
              </p>
            </div>
          ) : null}

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
              placeholder="Describe what's happening, when it started and what you've already tried."
              className={TEXTAREA}
            />
          </Field>

          <Field label="Photos / videos">
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              <Upload className="h-5 w-5" />
              <div>
                <div>Drop files here or click to upload</div>
                <div className="text-xs text-slate-400">
                  Max 25 MB per file (placeholder in demo)
                </div>
              </div>
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contact person">
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Preferred contact method">
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
                className={INPUT}
              >
                <option>Email</option>
                <option>Phone</option>
                <option>Portal</option>
                <option>SMS</option>
              </select>
            </Field>
          </div>

          {submitError ? (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {submitError}
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Create ticket"}
            </Button>
          </div>
        </form>
      )}

    </Modal>
  );
}

const INPUT =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100";
const TEXTAREA =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
