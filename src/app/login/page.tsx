"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Smartphone, Info } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "";
  const slackError = search.get("slack_error") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<string | null>(slackError || null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const j = await res.json();
      if (!res.ok) {
        setErr(j.error || "Login failed");
        return;
      }
      router.push(next || j.redirect || "/portal/sites");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const slackHref = `/api/auth/slack${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(to bottom, #0b1733 0%, #091a3b 35%, #060c20 70%, #02050d 100%)",
      }}
    >
      <div className="relative w-full max-w-sm space-y-7">
        <div className="text-center">
          <h1 className="text-4xl font-light tracking-wide text-slate-100">
            PI <span className="font-semibold text-brand-400">Network</span>
          </h1>
          <div className="mt-2 text-[11px] uppercase tracking-[0.25em] text-slate-500">
            Business Portal
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">
              Username
            </span>
            <input
              type="text"
              required
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-400 focus:bg-slate-900"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-400 focus:bg-slate-900"
            />
          </label>

          <label className="flex items-center justify-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
            />
            <span>Remember me</span>
            <span
              className="grid h-4 w-4 place-items-center rounded-full text-slate-500"
              title="Keeps you signed in for 7 days"
            >
              <Info className="h-3.5 w-3.5" />
            </span>
          </label>

          {err ? (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {err}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-brand-500 py-2.5 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-400 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="relative">
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-700/50" />
          <span
            className="relative mx-auto block w-fit px-3 text-[10px] uppercase tracking-[0.3em] text-slate-500"
            style={{ background: "#091a3b" }}
          >
            or
          </span>
        </div>

        <a
          href={slackHref}
          className="flex w-full items-center justify-center gap-2.5 rounded-md border border-slate-700 bg-slate-900/60 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800/60"
        >
          <SlackLogo className="h-4 w-4" />
          Sign in with Slack
        </a>

        <div className="flex items-center justify-between text-xs">
          <a
            href="/onsite"
            className="inline-flex items-center gap-1 text-slate-500 hover:text-brand-400"
          >
            <Smartphone className="h-3.5 w-3.5" /> Onsite PIN
          </a>
          <a href="/forgot" className="text-slate-500 hover:text-brand-400">
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}

function SlackLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#E01E5A"
        d="M5.04 15.165a2.523 2.523 0 0 1-2.52 2.52A2.523 2.523 0 0 1 0 15.165a2.527 2.527 0 0 1 2.521-2.52h2.52v2.52zm1.273 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.52 2.52v6.315A2.523 2.523 0 0 1 8.834 24a2.523 2.523 0 0 1-2.521-2.52v-6.315z"
      />
      <path
        fill="#36C5F0"
        d="M8.834 5.042a2.523 2.523 0 0 1-2.521-2.52A2.523 2.523 0 0 1 8.834 0a2.527 2.527 0 0 1 2.52 2.522v2.52H8.834zm0 1.272a2.527 2.527 0 0 1 2.52 2.522 2.527 2.527 0 0 1-2.52 2.52H2.522A2.527 2.527 0 0 1 0 8.836a2.523 2.523 0 0 1 2.521-2.522h6.313z"
      />
      <path
        fill="#2EB67D"
        d="M18.956 8.836a2.523 2.523 0 0 1 2.521-2.522A2.523 2.523 0 0 1 24 8.836a2.527 2.527 0 0 1-2.523 2.52h-2.521v-2.52zm-1.272 0a2.527 2.527 0 0 1-2.521 2.52 2.527 2.527 0 0 1-2.52-2.52V2.522A2.523 2.523 0 0 1 15.165 0a2.523 2.523 0 0 1 2.52 2.522v6.314z"
      />
      <path
        fill="#ECB22E"
        d="M15.165 18.956a2.523 2.523 0 0 1 2.52 2.521A2.523 2.523 0 0 1 15.165 24a2.527 2.527 0 0 1-2.521-2.523v-2.521h2.521zm0-1.272a2.527 2.527 0 0 1-2.521-2.521 2.527 2.527 0 0 1 2.521-2.52h6.314A2.523 2.523 0 0 1 24 15.165a2.523 2.523 0 0 1-2.521 2.52h-6.314z"
      />
    </svg>
  );
}
