import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addReferralActivity } from "@/lib/referral-store";
import type { ReferralActivity } from "@/lib/types";

const VALID_STATUS: ReferralActivity["status"][] = [
  "Invited",
  "Contacted",
  "Purchased",
  "Credit Applied",
];

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Partial<ReferralActivity>;
  const referredBusiness = (b.referredBusiness ?? "").trim();
  if (!referredBusiness)
    return NextResponse.json(
      { error: "referredBusiness required" },
      { status: 400 },
    );
  const status = VALID_STATUS.includes(b.status as ReferralActivity["status"])
    ? (b.status as ReferralActivity["status"])
    : "Invited";
  const a = await addReferralActivity({
    referredBusiness,
    status,
    eligibleService: (b.eligibleService ?? "").trim(),
    creditAmount:
      typeof b.creditAmount === "number" && b.creditAmount >= 0
        ? b.creditAmount
        : 0,
    date: (b.date ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
  });
  return NextResponse.json({ ok: true, activity: a });
}
