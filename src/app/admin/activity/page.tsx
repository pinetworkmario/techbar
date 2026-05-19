import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Activity } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listActivity } from "@/lib/activity";
import { ActivityClient } from "./ActivityClient";

export default async function ActivityPage() {
  const me = await getCurrentUser();
  if (!me?.isAdmin) redirect("/login?next=/admin/activity");
  const entries = listActivity(500);
  return (
    <div className="space-y-4">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Admin home
      </Link>
      <div>
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <Activity className="h-6 w-6 text-brand-600" />
          Activity Feed
        </h1>
        <p className="text-sm text-slate-500">
          Auto-recorded mutations across tickets / projects / maintenance /
          orders. Capped at 500 entries in <code>data/activity.json</code>.
        </p>
      </div>
      <ActivityClient initial={entries} />
    </div>
  );
}
