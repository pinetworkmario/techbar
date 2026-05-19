import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  verifyPin,
} from "@/lib/auth";
import { listUsers } from "@/lib/store";

/** Onsite quick login by PIN (4–6 digits). Returns ok + redirects to
 * /onsite/site (server-side site picker if multi-site, auto-redirect if one). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { pin?: string };
  const pin = (body.pin ?? "").trim();
  if (!/^\d{4,6}$/.test(pin))
    return NextResponse.json(
      { error: "PIN must be 4–6 digits" },
      { status: 400 },
    );

  // Linear scan; tiny user count. Don't reveal which user matched.
  const users = await listUsers();
  let match = null;
  for (const u of users) {
    if (u.disabled) continue;
    if (!u.pinHash || !u.pinSalt) continue;
    if (verifyPin(pin, u.pinHash, u.pinSalt)) {
      match = u;
      break;
    }
  }
  if (!match)
    return NextResponse.json(
      { error: "PIN not recognised" },
      { status: 401 },
    );

  const { token, expiresAt } = await createSession(match.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
  return NextResponse.json({
    ok: true,
    user: { id: match.id, name: match.name, email: match.email },
  });
}
