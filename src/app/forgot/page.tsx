"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Network, ArrowLeft } from "lucide-react";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      setBusy(false);
      setSubmitted(true);
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
              Forgot password
            </h1>
            <p className="text-xs text-slate-500">
              We'll notify your administrator.
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="space-y-3">
            <div className="rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
              If <span className="font-medium">{email || "that email"}</span> is
              registered, your PI Network administrator has been notified. They
              will reach out with a reset link shortly.
            </div>
            <p className="text-xs text-slate-500">
              Your existing password (if any) still works until the new one is
              set. If you don't hear back within a business day, call 1300
              PINETWORK.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-xs text-slate-500">
              Enter your account email. Your administrator will be notified
              and will send you a link to choose a new password.
            </p>
            <label className="block text-sm">
              <span className="block text-xs font-medium text-slate-700">
                Email
              </span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-brand-600 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Notify administrator"}
            </button>
            <Link
              href="/login"
              className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
