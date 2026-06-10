"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function AdminError({
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
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <div className="text-lg font-semibold text-slate-900">
          Something went wrong
        </div>
        <div className="mt-1 max-w-md text-sm text-slate-500">
          {error.message || "An unexpected error occurred."}
        </div>
      </div>
      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
