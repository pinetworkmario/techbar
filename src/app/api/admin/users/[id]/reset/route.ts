import { NextResponse } from "next/server";
import {
  generateInviteToken,
  getCurrentUser,
  inviteExpiry,
} from "@/lib/auth";
import {
  listInvites,
  listUsers,
  saveInvites,
  saveUsers,
} from "@/lib/store";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const users = await listUsers();
  const u = users.find((x) => x.id === id);
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  u.passwordHash = null;
  u.passwordSalt = null;
  u.updatedAt = new Date().toISOString();
  await saveUsers(users);
  const token = generateInviteToken();
  const invites = (await listInvites()).filter((i) => i.userId !== id);
  invites.push({ token, userId: id, expiresAt: inviteExpiry() });
  await saveInvites(invites);
  return NextResponse.json({ ok: true, inviteToken: token });
}
