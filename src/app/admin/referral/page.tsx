import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getReferralProgram } from "@/lib/referral-store";
import { ReferralClient } from "./ReferralClient";

export default async function ReferralPage() {
  const me = await getCurrentUser();
  if (!me?.isAdmin) redirect("/login?next=/admin/referral");
  const program = getReferralProgram();
  return (
    <div className="space-y-4">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Admin home
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Referrals</h1>
        <p className="text-sm text-slate-500">
          Global referral program (single shared code + credit pool). Per-user
          referral codes are a future TODO — see HANDOFF.md §10.
        </p>
      </div>
      <ReferralClient initial={program} />
    </div>
  );
}
