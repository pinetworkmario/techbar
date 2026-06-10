"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HandoffClaimButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/chat-handoffs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "claimed" }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={claim}
        disabled={busy}
        className="rounded-md border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-200 transition hover:bg-cyan-500/30 disabled:opacity-50"
      >
        {busy ? "Claiming…" : "Claim"}
      </button>
      {err ? <span className="text-[10px] text-rose-400">{err}</span> : null}
    </div>
  );
}
