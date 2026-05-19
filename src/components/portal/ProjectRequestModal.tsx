"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AddressAutocomplete } from "@/components/admin/AddressAutocomplete";

const CATEGORIES = [
  "New Store Opening",
  "CCTV Upgrade",
  "POS Rollout",
  "Router Replacement",
  "Network Upgrade",
] as const;

type Category = (typeof CATEGORIES)[number];

interface SiteOpt {
  id: string;
  name: string;
}

const STATES = ["VIC", "NSW", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export function ProjectRequestModal({
  open,
  onClose,
  onSubmitted,
  defaultCategory,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted?: (info: { projectName: string; ticketNumber: string }) => void;
  defaultCategory?: Category;
}) {
  const [sites, setSites] = useState<SiteOpt[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>(
    defaultCategory ?? "New Store Opening",
  );
  const [siteMode, setSiteMode] = useState<"existing" | "new">("new");
  const [siteId, setSiteId] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteState, setNewSiteState] = useState("VIC");
  const [newSiteAddress, setNewSiteAddress] = useState("");
  const [expectedCompletion, setExpectedCompletion] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    projectName: string;
    ticketNumber: string;
    siteCreated?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/account/sites")
      .then((r) => r.json())
      .then((j) => {
        const list: SiteOpt[] = j.sites || [];
        setSites(list);
        if (list.length > 0) {
          setSiteMode("existing");
          setSiteId(list[0].id);
        } else {
          setSiteMode("new");
        }
      })
      .catch(() => {
        setSites([]);
        setSiteMode("new");
      });
  }, [open]);

  function reset() {
    setName("");
    setSiteId("");
    setNewSiteName("");
    setNewSiteAddress("");
    setExpectedCompletion("");
    setDescription("");
    setError(null);
    setDone(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name,
        category,
        description,
        expectedCompletion,
      };
      if (siteMode === "new") {
        body.newSite = {
          name: newSiteName,
          state: newSiteState,
          address: newSiteAddress,
        };
      } else {
        body.siteId = siteId;
      }
      const r = await fetch("/api/account/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Failed to create project request");
        return;
      }
      setDone({
        projectName: j.project?.name ?? name,
        ticketNumber: j.ticket?.number ?? "PI-?",
        siteCreated: !!j.site?.created,
      });
      onSubmitted?.({
        projectName: j.project?.name ?? name,
        ticketNumber: j.ticket?.number ?? "PI-?",
      });
    } catch (e2) {
      setError(String(e2));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setTimeout(reset, 200);
      }}
      title={done ? "Project requested" : "Request a New Project"}
      description={
        done
          ? "Your account manager will be in touch to scope and plan."
          : "Tell us what you want built. We'll create the project and assign it to the projects team."
      }
    >
      {done ? (
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <div>
              <div className="font-semibold text-emerald-900">
                {done.projectName}
              </div>
              <div className="text-[11px] text-emerald-800/80">
                Tracking ticket{" "}
                <span className="font-mono">{done.ticketNumber}</span>
                {done.siteCreated
                  ? " · new site created and added to your account"
                  : ""}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            You can track status on the Projects page; updates will appear on
            the ticket.
          </p>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Project name *">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Geelong Store Opening"'
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Project type">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Target completion (optional)">
              <input
                type="date"
                value={expectedCompletion}
                onChange={(e) => setExpectedCompletion(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-slate-700">
              Site
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              <ModeChip
                active={siteMode === "existing"}
                onClick={() => setSiteMode("existing")}
                disabled={sites.length === 0}
              >
                Existing site
              </ModeChip>
              <ModeChip
                active={siteMode === "new"}
                onClick={() => setSiteMode("new")}
              >
                New site (PI Network will set it up)
              </ModeChip>
            </div>
            {siteMode === "existing" ? (
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                <Field label="New site name *">
                  <input
                    required={siteMode === "new"}
                    value={newSiteName}
                    onChange={(e) => setNewSiteName(e.target.value)}
                    placeholder='e.g. "Geelong Westfield"'
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </Field>
                <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
                  <Field label="State">
                    <select
                      value={newSiteState}
                      onChange={(e) => setNewSiteState(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    >
                      {STATES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Address *">
                    <AddressAutocomplete
                      required={siteMode === "new"}
                      value={newSiteAddress}
                      onChange={setNewSiteAddress}
                      placeholder="Start typing — Google suggests"
                    />
                  </Field>
                </div>
                <p className="text-[11px] text-slate-500">
                  We'll create this site under your account immediately and
                  give you full access. PI Network will configure modules + sync
                  hardware as the project progresses.
                </p>
              </div>
            )}
          </div>

          <Field label="What do you need built?">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder='e.g. "New 200 sqm cafe, 4× POS terminals, ceiling-mount Wi-Fi APs covering dining + back-of-house, CCTV at counter + back door, NBN + 4G failover."'
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>

          {error ? (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
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

function ModeChip({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 " +
        (active
          ? "bg-brand-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200")
      }
    >
      {children}
    </button>
  );
}
