import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import {
  findInvite,
  listInvites,
  listUsers,
  saveInvites,
  saveUsers,
} from "@/lib/store";

export async function POST(req: Request) {
  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { token, password } = body;
  if (!token || !password) {
    return NextResponse.json(
      { error: "Token and password required" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }
  const inv = await findInvite(token);
  if (!inv) {
    return NextResponse.json(
      { error: "Invalid or expired invitation" },
      { status: 400 },
    );
  }
  const users = await listUsers();
  const u = users.find((x) => x.id === inv.userId);
  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { hash, salt } = hashPassword(password);
  u.passwordHash = hash;
  u.passwordSalt = salt;
  u.updatedAt = new Date().toISOString();
  await saveUsers(users);
  const invites = (await listInvites()).filter((i) => i.token !== token);
  await saveInvites(invites);
  return NextResponse.json({ ok: true });
}
