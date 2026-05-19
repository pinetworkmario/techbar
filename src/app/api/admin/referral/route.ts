import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getReferralProgram,
  setReferralProgramMeta,
} from "@/lib/referral-store";

export async function GET() {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ program: getReferralProgram() });
}

export async function PATCH(req: Request) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const updated = await setReferralProgramMeta(body);
  return NextResponse.json({ ok: true, program: updated });
}
