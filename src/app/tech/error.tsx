"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function TechError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 ring-1 ring-rose-400/30">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <div className="text-lg font-semibold text-slate-100">
          Something went wrong
        </div>
        <div className="mt-1 max-w-md text-sm text-slate-400">
          {error.message || "An unexpected error occurred."}
        </div>
      </div>
      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-cyan-500/20 px-4 text-sm font-medium text-cyan-300 ring-1 ring-cyan-400/40 transition hover:bg-cyan-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        Try again
      </button>
    </div>
  );
}
