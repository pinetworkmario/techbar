import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <Compass className="h-6 w-6" />
      </div>
      <div>
        <div className="text-lg font-semibold text-slate-900">
          Page not found
        </div>
        <div className="mt-1 max-w-md text-sm text-slate-500">
          The page you were looking for has moved or no longer exists.
        </div>
      </div>
      <Link
        href="/portal/sites"
        className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        Go to my sites
      </Link>
    </div>
  );
}
