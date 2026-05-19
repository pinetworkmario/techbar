import Link from "next/link";
import { listUsers } from "@/lib/store";
import { sites, devices } from "@/lib/data";
import { Building2, Users as UsersIcon, ShieldCheck, Mail } from "lucide-react";
import { ResetRequestsPanel } from "./ResetRequestsPanel";

export default async function AdminDashboard() {
  const users = await listUsers();
  const activeUsers = users.filter((u) => !u.disabled && u.passwordHash);
  const pending = users.filter((u) => !u.passwordHash);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Admin overview
        </h1>
        <p className="text-sm text-slate-500">
          Manage who can access the portal, and edit per-site / per-device
          information.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Sites"
          value={sites.length}
          href="/admin/sites"
          icon={Building2}
        />
        <Tile
          label="Devices"
          value={devices.length}
          href="/admin/sites"
          icon={Building2}
        />
        <Tile
          label="Active users"
          value={activeUsers.length}
          href="/admin/users"
          icon={UsersIcon}
        />
        <Tile
          label="Invites pending"
          value={pending.length}
          href="/admin/users"
          icon={Mail}
        />
      </div>

      <ResetRequestsPanel />

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-brand-600" />
          <div className="text-sm text-slate-600">
            <div className="font-medium text-slate-900">How invitations work</div>
            <p className="mt-1">
              When you create a new user, the system generates a one-time
              <span className="font-mono"> /set-password?token=… </span>
              link. Send that link to the user (email, Slack, SMS — your call)
              so they can choose their own password. Invitations expire after
              7 days.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              In production this would be sent automatically by email; SMTP is
              not yet wired in this prototype.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/users"
          className="block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-sm"
        >
          <div className="text-sm font-semibold text-slate-900">
            Manage users →
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Create, disable, reset password, and set per-site / per-module
            permissions.
          </p>
        </Link>
        <Link
          href="/admin/sites"
          className="block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-sm"
        >
          <div className="text-sm font-semibold text-slate-900">
            Manage sites & devices →
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Edit asset numbers and upload location photos for each device at
            each site.
          </p>
        </Link>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: typeof Building2;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-sm"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </Link>
  );
}
