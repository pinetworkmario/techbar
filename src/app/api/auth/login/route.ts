import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserByEmail } from "@/lib/store";
import {
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req: Request) {
  let body: { email?: string; password?: string; remember?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { email, password, remember } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 },
    );
  }
  const user = await findUserByEmail(email);
  if (
    !user ||
    user.disabled ||
    !user.passwordHash ||
    !user.passwordSalt ||
    !verifyPassword(password, user.passwordHash, user.passwordSalt)
  ) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const { token, expiresAt } = await createSession(user.id);
  const c = await cookies();
  const cookieExpiry = remember === false ? undefined : expiresAt;
  c.set(SESSION_COOKIE, token, cookieOptions(cookieExpiry));
  const redirect = user.isAdmin
    ? "/admin"
    : user.isTech
      ? "/tech/sites"
      : "/portal/sites";
  return NextResponse.json({ ok: true, redirect });
}
