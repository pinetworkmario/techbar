"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/i18n";

export function LanguageToggle({ current }: { current: Lang }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Lang>(current);

  async function switchTo(lang: Lang) {
    if (lang === optimistic || pending) return;
    setOptimistic(lang);
    try {
      const res = await fetch("/api/lang", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang }),
      });
      if (!res.ok) {
        setOptimistic(current);
        return;
      }
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setOptimistic(current);
    }
  }

  const seg =
    "px-3 h-7 text-xs font-medium rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";
  const active = "bg-white text-slate-900 shadow-sm";
  const inactive = "text-slate-500 hover:text-slate-700";

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 ring-1 ring-slate-200"
    >
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={cn(seg, optimistic === "en" ? active : inactive)}
        aria-pressed={optimistic === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchTo("zh")}
        className={cn(seg, optimistic === "zh" ? active : inactive)}
        aria-pressed={optimistic === "zh"}
      >
        中
      </button>
    </div>
  );
}
