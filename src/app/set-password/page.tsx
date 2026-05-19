"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Network } from "lucide-react";

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) {
      setErr("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setErr("Use at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const j = await res.json();
      if (!res.ok) {
        setErr(j.error || "Failed");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600 text-white">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              Set your password
            </h1>
            <p className="text-xs text-slate-500">
              Pick a new password (min 8 characters).
            </p>
          </div>
        </div>

        {!token ? (
          <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            No invitation token in URL. Ask your administrator for a fresh
            invite link.
          </div>
        ) : done ? (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Password set. Redirecting to sign in…
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm">
              <span className="block text-xs font-medium text-slate-700">
                New password
              </span>
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </label>
            <label className="block text-sm">
              <span className="block text-xs font-medium text-slate-700">
                Confirm
              </span>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </label>
            {err ? (
              <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {err}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-brand-600 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Set password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
