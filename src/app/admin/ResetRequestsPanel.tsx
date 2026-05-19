"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, Mail, Trash2 } from "lucide-react";

interface ResetRequest {
  id: string;
  userId: string;
  email: string;
  inviteToken: string;
  inviteExpiresAt: string;
  createdAt: string;
  ip?: string;
}

export function ResetRequestsPanel() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/reset-requests");
    const j = await r.json();
    setRequests(j.requests || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function dismiss(id: string) {
    if (!confirm("Dismiss this reset request? The invite link stays valid until used or expired.")) return;
    const r = await fetch(`/api/admin/reset-requests/${id}`, {
      method: "DELETE",
    });
    if (r.ok) load();
  }

  function buildUrl(token: string) {
    return `${typeof window !== "undefined" ? window.location.origin : ""}/set-password?token=${token}`;
  }

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-5">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-5 w-5 text-amber-700" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-amber-900">
            Pending password reset requests ({requests.length})
          </div>
          <p className="mt-1 text-xs text-amber-800">
            Each request below has an invite link ready. Send it to the user
            (email, Slack, SMS) so they can choose a new password. Their
            existing password keeps working until the invite is used.
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {requests.map((r) => {
          const url = buildUrl(r.inviteToken);
          return (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-white p-3 text-sm"
            >
              <Mail className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-slate-900">{r.email}</span>
              <span className="text-xs text-slate-500">
                requested {new Date(r.createdAt).toLocaleString()}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-72 max-w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(url);
                    setCopied(r.id);
                    setTimeout(
                      () => setCopied((cur) => (cur === r.id ? null : cur)),
                      1500,
                    );
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === r.id ? "Copied" : "Copy URL"}
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(r.id)}
                  title="Dismiss request"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
