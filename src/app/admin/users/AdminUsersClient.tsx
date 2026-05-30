"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  Copy,
  KeyRound,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { ServiceCategory } from "@/lib/types";

interface SiteOption {
  id: string;
  name: string;
}
interface SiteGroupOption {
  id: string;
  name: string;
  siteIds: string[];
}

const MODULES: { key: ServiceCategory; label: string }[] = [
  { key: "network", label: "Network" },
  { key: "voice", label: "Voice" },
  { key: "cctv", label: "CCTV & Alarm" },
  { key: "pos", label: "POS" },
  { key: "endpoint", label: "Endpoint" },
  { key: "it_support", label: "IT Support" },
  { key: "projects", label: "Projects" },
  { key: "traffic_analysis", label: "Traffic Analysis" },
];

type EffectiveRole = "admin" | "tech" | "customer_admin" | "customer_user";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
  isTech?: boolean;
  customerRole?: "admin" | "user" | null;
  effectiveRole?: EffectiveRole;
  disabled: boolean;
  hasPassword: boolean;
  hasPin: boolean;
  permissions: Record<string, ServiceCategory[]>;
  parentUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

const ROLE_OPTIONS: { value: EffectiveRole; label: string; hint: string }[] = [
  { value: "admin", label: "PI Network Admin", hint: "Full edit access to users, sites, billing, everything" },
  { value: "tech", label: "PI Network Tech", hint: "/tech shell — all sites read + vendor portals; no user / billing edits" },
  { value: "customer_admin", label: "Customer Admin", hint: "Top-level customer contact; manages their own sub-contacts" },
  { value: "customer_user", label: "Customer User", hint: "Sub-contact under a customer admin; site-scoped" },
];

function roleLabelOf(er?: EffectiveRole | null) {
  return ROLE_OPTIONS.find((o) => o.value === er)?.label ?? "Customer Admin";
}

export function AdminUsersClient({
  sites,
  groups,
}: {
  sites: SiteOption[];
  groups: SiteGroupOption[];
}) {
  const [users, setUsers] = useState<UserRow[]>([]);
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
    const r = await fetch("/api/admin/users");
    const j = await r.json();
    setUsers(j.users || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function buildUrl(token: string) {
    return `${window.location.origin}/set-password?token=${token}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">
            Create accounts, set per-site / per-module permissions, reset
            passwords or disable.
          </p>
        </div>
        <button
          onClick={() => {
            setCreating(true);
            setError(null);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> New user
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
                Send this URL to the user. It expires in 7 days. They will set
                their own password from this page.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  readOnly
                  value={inviteUrl.url}
                  className="w-full min-w-0 rounded-md border border-emerald-200 bg-white px-3 py-1.5 font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(inviteUrl.url)
                  }
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
        <CreateUserForm
          sites={sites}
          groups={groups}
          users={users}
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
              <th className="px-4 py-2 font-medium" />
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Sites</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  No users yet.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <UserRowView
                  key={u.id}
                  user={u}
                  sites={sites}
                  groups={groups}
                  allUsers={users}
                  expanded={expanded === u.id}
                  onToggle={() =>
                    setExpanded((prev) => (prev === u.id ? null : u.id))
                  }
                  onChanged={load}
                  onInvite={(token) =>
                    setInviteUrl({ url: buildUrl(token), forEmail: u.email })
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

function CreateUserForm({
  sites,
  groups,
  users,
  onCancel,
  onCreated,
  onError,
}: {
  sites: SiteOption[];
  groups: SiteGroupOption[];
  users: UserRow[];
  onCancel: () => void;
  onCreated: (token: string, email: string) => void;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [effectiveRole, setEffectiveRole] = useState<EffectiveRole>("customer_admin");
  const [role, setRole] = useState("");
  const [perms, setPerms] = useState<Record<string, ServiceCategory[]>>({});
  const [parentUserId, setParentUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const isInternal = effectiveRole === "admin" || effectiveRole === "tech";
  const customerAdmins = useMemo(
    () => users.filter((u) => u.effectiveRole === "customer_admin"),
    [users],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (effectiveRole === "customer_user" && !parentUserId) {
      onError("Pick the parent customer admin for this customer user.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          role: role || roleLabelOf(effectiveRole),
          effectiveRole,
          permissions: isInternal ? {} : perms,
          parentUserId:
            effectiveRole === "customer_user" ? parentUserId : undefined,
        }),
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
      <div className="text-sm font-semibold text-slate-900">
        Create new user
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
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
        <Field label="Role (display, optional)">
          <input
            type="text"
            value={role}
            placeholder={roleLabelOf(effectiveRole)}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Access level">
          <select
            value={effectiveRole}
            onChange={(e) => setEffectiveRole(e.target.value as EffectiveRole)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            {ROLE_OPTIONS.find((o) => o.value === effectiveRole)?.hint}
          </p>
        </Field>
        {effectiveRole === "customer_user" ? (
          <Field label="Parent customer admin">
            <select
              required
              value={parentUserId}
              onChange={(e) => setParentUserId(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Choose customer admin…</option>
              {customerAdmins.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Customer users inherit a subset of their parent admin's site
              access.
            </p>
          </Field>
        ) : null}
      </div>

      {!isInternal ? (
        <PermissionsEditor
          sites={sites}
          groups={groups}
          permissions={perms}
          onChange={setPerms}
        />
      ) : null}

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
          {busy ? "Creating…" : "Create user"}
        </button>
      </div>
    </form>
  );
}

function PermissionsEditor({
  sites,
  groups,
  permissions,
  onChange,
}: {
  sites: SiteOption[];
  groups: SiteGroupOption[];
  permissions: Record<string, ServiceCategory[]>;
  onChange: (p: Record<string, ServiceCategory[]>) => void;
}) {
  function toggle(siteId: string, mod: ServiceCategory, on: boolean) {
    const cur = new Set(permissions[siteId] ?? []);
    if (on) cur.add(mod);
    else cur.delete(mod);
    const next = { ...permissions };
    if (cur.size === 0) delete next[siteId];
    else next[siteId] = Array.from(cur);
    onChange(next);
  }
  function setSiteAll(siteId: string, on: boolean) {
    const next = { ...permissions };
    if (on) next[siteId] = MODULES.map((m) => m.key);
    else delete next[siteId];
    onChange(next);
  }

  return (
    <div>
      <BulkGrantFromGroup
        groups={groups}
        permissions={permissions}
        onApply={(updated) => onChange(updated)}
      />
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        Per-site, per-module access
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
              {MODULES.map((m) => (
                <th
                  key={m.key}
                  className="px-2 py-2 text-center font-medium text-slate-600"
                >
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sites.map((s) => {
              const allOn = (permissions[s.id]?.length ?? 0) === MODULES.length;
              return (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-medium text-slate-700">
                    {s.name}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={allOn}
                      onChange={(e) => setSiteAll(s.id, e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                  {MODULES.map((m) => (
                    <td key={m.key} className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={permissions[s.id]?.includes(m.key) ?? false}
                        onChange={(e) => toggle(s.id, m.key, e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        Tip: tick a row's "All" box to grant the user every module at that site.
      </p>
    </div>
  );
}

function UserRowView({
  user,
  sites,
  groups,
  allUsers,
  expanded,
  onToggle,
  onChanged,
  onInvite,
  onError,
}: {
  user: UserRow;
  sites: SiteOption[];
  groups: SiteGroupOption[];
  allUsers: UserRow[];
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
  onInvite: (token: string) => void;
  onError: (msg: string) => void;
}) {
  const [perms, setPerms] = useState(user.permissions);
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [effectiveRole, setEffectiveRole] = useState<EffectiveRole>(
    user.effectiveRole ??
      (user.isAdmin
        ? "admin"
        : user.isTech
          ? "tech"
          : user.customerRole === "user"
            ? "customer_user"
            : "customer_admin"),
  );
  const [parentUserId, setParentUserId] = useState<string>(
    user.parentUserId ?? "",
  );
  const isAdmin = effectiveRole === "admin";
  const isInternal = effectiveRole === "admin" || effectiveRole === "tech";
  const [savingPerms, setSavingPerms] = useState(false);
  const customerAdmins = useMemo(
    () =>
      allUsers.filter(
        (u) => u.effectiveRole === "customer_admin" && u.id !== user.id,
      ),
    [allUsers, user.id],
  );

  const sitesCount = useMemo(
    () => Object.keys(user.permissions).length,
    [user.permissions],
  );

  async function patch(payload: Record<string, unknown>) {
    const r = await fetch(`/api/admin/users/${user.id}`, {
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
    const r = await fetch(`/api/admin/users/${user.id}/reset`, {
      method: "POST",
    });
    const j = await r.json();
    if (!r.ok) return onError(j.error || "Reset failed");
    onInvite(j.inviteToken);
    onChanged();
  }

  async function remove() {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    const r = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return onError(j.error || "Delete failed");
    onChanged();
  }

  async function savePermissions() {
    setSavingPerms(true);
    const ok = await patch({ permissions: isInternal ? {} : perms });
    setSavingPerms(false);
    if (ok) onChanged();
  }

  return (
    <>
      <tr className="hover:bg-slate-50/60">
        <td className="px-2 py-2">
          <button
            type="button"
            onClick={onToggle}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Expand"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-4 py-2 font-medium text-slate-900">{user.name}</td>
        <td className="px-4 py-2 text-slate-700">{user.email}</td>
        <td className="px-4 py-2 text-slate-600">
          {user.isAdmin ? (
            <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              <ShieldCheck className="h-3 w-3" /> Admin
            </span>
          ) : user.isTech ? (
            <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
              Tech
            </span>
          ) : user.customerRole === "user" ? (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              Customer user
            </span>
          ) : (
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
              Customer admin
            </span>
          )}
        </td>
        <td className="px-4 py-2">
          {user.disabled ? (
            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
              Disabled
            </span>
          ) : !user.hasPassword ? (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              Invite pending
            </span>
          ) : (
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
              Active
            </span>
          )}
        </td>
        <td className="px-4 py-2 text-xs text-slate-600">
          {user.isAdmin || user.isTech
            ? "All sites"
            : `${sitesCount} site(s)`}
        </td>
        <td className="px-4 py-2">
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={reset}
              title="Reset password (sends fresh invite link)"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              <KeyRound className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              type="button"
              onClick={async () => {
                const ok = await patch({ disabled: !user.disabled });
                if (ok) onChanged();
              }}
              className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              {user.disabled ? "Enable" : "Disable"}
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
          <td colSpan={7} className="px-4 py-4">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
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
                <Field label="Access level">
                  <select
                    value={effectiveRole}
                    onChange={(e) =>
                      setEffectiveRole(e.target.value as EffectiveRole)
                    }
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                {effectiveRole === "customer_user" ? (
                  <Field label="Parent customer admin">
                    <select
                      value={parentUserId}
                      onChange={(e) => setParentUserId(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                    >
                      <option value="">Choose customer admin…</option>
                      {customerAdmins.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
              </div>
              <PinEditor userId={user.id} hasPin={user.hasPin} />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    if (effectiveRole === "customer_user" && !parentUserId) {
                      onError(
                        "Pick the parent customer admin for this customer user.",
                      );
                      return;
                    }
                    const payload: Record<string, unknown> = {
                      name,
                      role,
                      effectiveRole,
                    };
                    if (effectiveRole === "customer_user") {
                      payload.parentUserId = parentUserId;
                    }
                    const ok = await patch(payload);
                    if (ok) onChanged();
                  }}
                  className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
                >
                  Save profile
                </button>
              </div>
              {!isInternal ? (
                <>
                  <PermissionsEditor
          sites={sites}
          groups={groups}
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
                </>
              ) : (
                <div className="text-xs text-slate-500">
                  Admin users have full access to all sites and modules; the
                  permissions matrix is not used for them.
                </div>
              )}
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

function BulkGrantFromGroup({
  groups,
  permissions,
  onApply,
}: {
  groups: SiteGroupOption[];
  permissions: Record<string, ServiceCategory[]>;
  onApply: (next: Record<string, ServiceCategory[]>) => void;
}) {
  const [groupId, setGroupId] = useState("");
  const [picked, setPicked] = useState<Set<ServiceCategory>>(
    new Set(MODULES.map((m) => m.key)),
  );
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  const group = groups.find((g) => g.id === groupId);

  function togglePerm(p: ServiceCategory) {
    const next = new Set(picked);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setPicked(next);
  }

  function apply() {
    if (!group || picked.size === 0) return;
    const next = { ...permissions };
    const mods = Array.from(picked);
    for (const sid of group.siteIds) {
      if (mode === "replace") {
        next[sid] = mods.slice();
      } else {
        const set = new Set(next[sid] ?? []);
        for (const m of mods) set.add(m);
        next[sid] = Array.from(set);
      }
    }
    onApply(next);
  }

  function revoke() {
    if (!group) return;
    const next = { ...permissions };
    for (const sid of group.siteIds) delete next[sid];
    onApply(next);
  }

  if (groups.length === 0) {
    return (
      <div className="mb-3 rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
        No site groups yet. Create one in{" "}
        <a
          href="/admin/site-groups"
          className="text-brand-600 hover:underline"
        >
          Site Groups
        </a>{" "}
        to grant access to many sites at once.
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-md border border-slate-200 bg-slate-50/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
        <Boxes className="h-4 w-4 text-brand-600" />
        Bulk Grant from Site Group
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-600">
            Group
          </span>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">— pick group —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.siteIds.length})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-600">
            Mode
          </span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "merge" | "replace")}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="merge">Merge (add to existing)</option>
            <option value="replace">Replace (overwrite)</option>
          </select>
        </label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={apply}
            disabled={!group || picked.size === 0}
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={revoke}
            disabled={!group}
            className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-2 text-xs font-medium text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50"
            title="Remove all per-site permissions for this group's sites"
          >
            Revoke
          </button>
        </div>
      </div>
      <div className="mt-2">
        <span className="mb-1 block text-[11px] font-medium text-slate-600">
          Modules to grant
        </span>
        <div className="flex flex-wrap gap-1.5">
          {MODULES.map((m) => {
            const on = picked.has(m.key);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => togglePerm(m.key)}
                className={
                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition " +
                  (on
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                }
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
      {group ? (
        <p className="mt-2 text-[11px] text-slate-500">
          Will affect {group.siteIds.length} site
          {group.siteIds.length === 1 ? "" : "s"} in{" "}
          <span className="font-medium">{group.name}</span>. {mode === "merge"
            ? "Merge keeps any existing module permissions."
            : "Replace overwrites all per-site permissions for these sites."}
        </p>
      ) : null}
    </div>
  );
}

function PinEditor({
  userId,
  hasPin,
}: {
  userId: string;
  hasPin: boolean;
}) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(
    null,
  );

  async function save(value: string) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ tone: "err", text: j.error || "Save failed" });
        return;
      }
      setMsg({
        tone: "ok",
        text: value ? "PIN saved" : "PIN cleared",
      });
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-white p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs font-medium text-slate-700">
          Onsite (iPad) PIN
        </div>
        <span
          className={
            "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 " +
            (hasPin
              ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
              : "bg-slate-100 text-slate-500 ring-slate-200")
          }
        >
          {hasPin ? "Set" : "Not set"}
        </span>
      </div>
      <p className="mb-2 text-[11px] text-slate-500">
        4–6 digits. Used at <code>/onsite</code> for quick iPad access. Must
        be unique across active users.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="e.g. 4729"
          className="w-32 rounded-md border border-slate-200 px-3 py-1.5 font-mono text-sm tracking-widest"
        />
        <button
          type="button"
          disabled={busy || pin.length < 4}
          onClick={() => save(pin)}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {hasPin ? "Replace PIN" : "Set PIN"}
        </button>
        {hasPin ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (confirm("Clear this user's onsite PIN?")) void save("");
            }}
            className="rounded-md bg-white px-3 py-1.5 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50"
          >
            Clear
          </button>
        ) : null}
        {msg ? (
          <span
            className={
              "text-[11px] " +
              (msg.tone === "ok" ? "text-emerald-600" : "text-rose-600")
            }
          >
            {msg.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
