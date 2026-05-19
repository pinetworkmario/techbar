"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Delete, Lock, Zap } from "lucide-react";

const PIN_LEN = 6;

export function OnsitePinClient() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  function push(d: string) {
    setError(null);
    setPin((p) => (p.length < PIN_LEN ? p + d : p));
  }
  function back() {
    setPin((p) => p.slice(0, -1));
  }

  async function submit(value: string = pin) {
    if (value.length < 4) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Incorrect PIN");
        setPin("");
        return;
      }
      router.push("/onsite/site");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  // Auto-submit once 6 digits entered.
  useEffect(() => {
    if (pin.length === PIN_LEN && !busy) void submit(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Background grid + glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(56,189,248,0.25), transparent 40%), radial-gradient(circle at 80% 90%, rgba(168,85,247,0.18), transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 py-10">
        <div className="mb-8 flex items-center gap-2 text-sm uppercase tracking-[0.4em] text-sky-400">
          <Zap className="h-4 w-4" />
          PI Network
        </div>

        <h1 className="text-center text-3xl font-bold tracking-tight">
          Onsite Mode
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Quick access for the in-store iPad. Enter your team PIN.
        </p>

        {/* PIN dots */}
        <div className="mt-10 flex gap-3">
          {Array.from({ length: PIN_LEN }).map((_, i) => {
            const filled = i < pin.length;
            return (
              <span
                key={i}
                className={
                  "h-3.5 w-3.5 rounded-full transition " +
                  (filled
                    ? "bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.7)]"
                    : "bg-slate-700")
                }
              />
            );
          })}
        </div>

        {error ? (
          <div className="mt-6 rounded-md bg-rose-500/15 px-3 py-2 text-sm text-rose-200 ring-1 ring-rose-500/30">
            {error}
          </div>
        ) : null}

        {/* Keypad */}
        <div className="mt-8 grid w-full grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <Key key={d} onPress={() => push(String(d))} disabled={busy}>
              {d}
            </Key>
          ))}
          <div />
          <Key onPress={() => push("0")} disabled={busy}>
            0
          </Key>
          <Key
            onPress={back}
            disabled={busy || pin.length === 0}
            variant="muted"
          >
            <Delete className="h-6 w-6" />
          </Key>
        </div>

        <div className="mt-10 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-slate-500">
          <Lock className="h-3 w-3" /> Local PIN login · iPad-friendly
        </div>
        {now ? (
          <div className="mt-2 font-mono text-xs text-slate-600">
            {now.toLocaleString()}
          </div>
        ) : null}
        <a
          href="/login"
          className="mt-6 text-[11px] text-slate-500 hover:text-slate-300"
        >
          Need full access? Use the standard login →
        </a>
      </div>
    </div>
  );
}

function Key({
  children,
  onPress,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "muted";
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className={
        "flex h-20 items-center justify-center rounded-2xl border text-2xl font-light transition active:scale-95 disabled:opacity-40 " +
        (variant === "primary"
          ? "border-slate-700 bg-slate-800/60 text-slate-100 backdrop-blur hover:bg-slate-700/70 hover:border-sky-500/50 hover:shadow-[0_0_24px_rgba(56,189,248,0.15)]"
          : "border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:border-slate-700")
      }
    >
      {children}
    </button>
  );
}
