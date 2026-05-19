"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  KeyRound,
  Mail,
  Plus,
  Trash2,
} from "lucide-react";
import type { ServiceCategoryKey } from "@/lib/store";

const MODULE_LABEL: Record<ServiceCategoryKey, string> = {
  network: "Network",
  voice: "Voice",
  cctv: "CCTV & Alarm",
  pos: "POS",
  endpoint: "Endpoint",
  it_support: "IT Support",
  projects: "Projects",
  traffic_analysis: "Traffic Analysis",
};

interface ScopeRow {
  siteId: string;
  siteName: string;
  modules: ServiceCategoryKey[];
}

interface ContactRow {
  id: string;
  email: string;
  name: string;
  role: string;
  disabled: boolean;
  hasPassword: boolean;
  permissions: Record<string, ServiceCategoryKey[]>;
  createdAt: string;
}

export function ContactsClient({
  allowedScope,
}: {
  allowedScope: ScopeRow[];
}) {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<{
    url: string;
    forEmail: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/account/contacts");
    const j = await r.json();
    if (!r.ok) {
      setError(j.error || "Failed to load");
      setContacts([]);
    } else {
      setContacts(j.contacts || []);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function buildUrl(token: string) {
    return `${window.location.origin}/set-password?token=${token}`;
  }

  if (allowedScope.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        You currently have no site access of your own — there's nothing to
        delegate yet. Ask your account manager to grant you site access first.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs text-slate-500">
          You can grant up to {allowedScope.length} site(s) and the modules you
          already have access to.
        </p>
        <button
          onClick={() => {
            setCreating(true);
            setError(null);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Add contact
        </button>
      </div>

      {inviteUrl ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 text-emerald-700" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-emerald-900">
                Invite link ready for {inviteUrl.forEmail}
              </div>
              <p className="mt-1 text-xs text-emerald-700">
                Send this URL to your contact (e.g. via email or SMS). It
                expires in 7 days. They'll use it to set their own password.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  readOnly
                  value={inviteUrl.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full min-w-0 rounded-md border border-emerald-200 bg-white px-3 py-1.5 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(inviteUrl.url)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button
                  type="button"
                  onClick={() => setInviteUrl(null)}
                  className="text-xs text-emerald-700 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {creating ? (
        <CreateContactForm
          allowedScope={allowedScope}
          onCancel={() => setCreating(false)}
          onCreated={(token, email) => {
            setCreating(false);
            setInviteUrl({ url: buildUrl(token), forEmail: email });
            load();
          }}
          onError={(msg) => setError(msg)}
        />
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2" />
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Sites</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No contacts yet. Click "Add contact" to invite a teammate.
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <ContactRowView
                  key={c.id}
                  contact={c}
                  allowedScope={allowedScope}
                  expanded={expanded === c.id}
                  onToggle={() =>
                    setExpanded((p) => (p === c.id ? null : c.id))
                  }
                  onChanged={load}
                  onInvite={(token) =>
                    setInviteUrl({ url: buildUrl(token), forEmail: c.email })
                  }
                  onError={setError}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateContactForm({
  allowedScope,
  onCancel,
  onCreated,
  onError,
}: {
  allowedScope: ScopeRow[];
  onCancel: () => void;
  onCreated: (token: string, email: string) => void;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Site contact");
  const [perms, setPerms] = useState<Record<string, ServiceCategoryKey[]>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/account/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name, role, permissions: perms }),
      });
      const j = await res.json();
      if (!res.ok) {
        onError(j.error || "Failed");
        return;
      }
      onCreated(j.inviteToken, email);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-lg border border-brand-200 bg-brand-50/40 p-5"
    >
      <div className="text-sm font-semibold text-slate-900">Invite a contact</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Full name">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Role (display)">
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <ScopedPermissionsEditor
        allowedScope={allowedScope}
        permissions={perms}
        onChange={setPerms}
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? "Inviting…" : "Send invite"}
        </button>
      </div>
    </form>
  );
}

function ScopedPermissionsEditor({
  allowedScope,
  permissions,
  onChange,
}: {
  allowedScope: ScopeRow[];
  permissions: Record<string, ServiceCategoryKey[]>;
  onChange: (p: Record<string, ServiceCategoryKey[]>) => void;
}) {
  function toggle(siteId: string, mod: ServiceCategoryKey, on: boolean) {
    const cur = new Set(permissions[siteId] ?? []);
    if (on) cur.add(mod);
    else cur.delete(mod);
    const next = { ...permissions };
    if (cur.size === 0) delete next[siteId];
    else next[siteId] = Array.from(cur);
    onChange(next);
  }
  function setSiteAll(siteId: string, mods: ServiceCategoryKey[], on: boolean) {
    const next = { ...permissions };
    if (on) next[siteId] = [...mods];
    else delete next[siteId];
    onChange(next);
  }

  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        Grant access (only your own sites and modules are listed)
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Site
              </th>
              <th className="px-3 py-2 text-center font-medium text-slate-600">
                All
              </th>
              {(
                [
                  "network",
                  "voice",
                  "cctv",
                  "pos",
                  "endpoint",
                  "it_support",
                  "projects",
                  "traffic_analysis",
                ] as ServiceCategoryKey[]
              ).map((m) => (
                <th
                  key={m}
                  className="px-2 py-2 text-center font-medium text-slate-600"
                >
                  {MODULE_LABEL[m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allowedScope.map((s) => {
              const allowed = new Set(s.modules);
              const granted = permissions[s.siteId] ?? [];
              const allOn =
                granted.length === s.modules.length &&
                s.modules.every((m) => granted.includes(m));
              return (
                <tr key={s.siteId}>
                  <td className="px-3 py-2 font-medium text-slate-700">
                    {s.siteName}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={allOn}
                      onChange={(e) =>
                        setSiteAll(s.siteId, s.modules, e.target.checked)
                      }
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                  {(
                    [
                      "network",
                      "voice",
                      "cctv",
                      "pos",
                      "endpoint",
                      "it_support",
                      "projects",
                    ] as ServiceCategoryKey[]
                  ).map((m) => {
                    const allowedHere = allowed.has(m);
                    const checked = granted.includes(m);
                    return (
                      <td key={m} className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          disabled={!allowedHere}
                          checked={checked}
                          onChange={(e) =>
                            toggle(s.siteId, m, e.target.checked)
                          }
                          title={
                            allowedHere
                              ? ""
                              : "You don't have this module — cannot grant it"
                          }
                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-30"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContactRowView({
  contact,
  allowedScope,
  expanded,
  onToggle,
  onChanged,
  onInvite,
  onError,
}: {
  contact: ContactRow;
  allowedScope: ScopeRow[];
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
  onInvite: (token: string) => void;
  onError: (msg: string) => void;
}) {
  const [perms, setPerms] = useState(contact.permissions);
  const [name, setName] = useState(contact.name);
  const [role, setRole] = useState(contact.role);
  const [savingPerms, setSavingPerms] = useState(false);

  async function patch(payload: Record<string, unknown>) {
    const r = await fetch(`/api/account/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      onError(j.error || "Update failed");
      return false;
    }
    return true;
  }

  async function reset() {
    const r = await fetch(`/api/account/contacts/${contact.id}/reset`, {
      method: "POST",
    });
    const j = await r.json();
    if (!r.ok) return onError(j.error || "Reset failed");
    onInvite(j.inviteToken);
    onChanged();
  }

  async function remove() {
    if (!confirm(`Remove ${contact.email}?`)) return;
    const r = await fetch(`/api/account/contacts/${contact.id}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return onError(j.error || "Delete failed");
    }
    onChanged();
  }

  async function savePermissions() {
    setSavingPerms(true);
    const ok = await patch({ permissions: perms });
    setSavingPerms(false);
    if (ok) onChanged();
  }

  const sitesCount = Object.keys(contact.permissions).length;

  return (
    <>
      <tr className="hover:bg-slate-50/60">
        <td className="px-2 py-2">
          <button
            type="button"
            onClick={onToggle}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-4 py-2 font-medium text-slate-900">{contact.name}</td>
        <td className="px-4 py-2 text-slate-700">{contact.email}</td>
        <td className="px-4 py-2">
          {contact.disabled ? (
            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
              Disabled
            </span>
          ) : !contact.hasPassword ? (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              Invite pending
            </span>
          ) : (
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
              Active
            </span>
          )}
        </td>
        <td className="px-4 py-2 text-xs text-slate-600">{sitesCount}</td>
        <td className="px-4 py-2">
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              <KeyRound className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              type="button"
              onClick={async () => {
                const ok = await patch({ disabled: !contact.disabled });
                if (ok) onChanged();
              }}
              className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              {contact.disabled ? "Enable" : "Disable"}
            </button>
            <button
              type="button"
              onClick={remove}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="bg-slate-50/40">
          <td colSpan={6} className="px-4 py-4">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                  />
                </Field>
                <Field label="Role">
                  <input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await patch({ name, role });
                    if (ok) onChanged();
                  }}
                  className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
                >
                  Save profile
                </button>
              </div>
              <ScopedPermissionsEditor
                allowedScope={allowedScope}
                permissions={perms}
                onChange={setPerms}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={savingPerms}
                  onClick={savePermissions}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {savingPerms ? "Saving…" : "Save permissions"}
                </button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
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
