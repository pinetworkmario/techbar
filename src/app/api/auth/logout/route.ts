import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, destroySession } from "@/lib/auth";

export async function POST() {
  const c = await cookies();
  const tok = c.get(SESSION_COOKIE)?.value;
  if (tok) await destroySession(tok);
  c.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
