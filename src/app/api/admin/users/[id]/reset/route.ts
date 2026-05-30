import { NextResponse } from "next/server";
import {
  generateInviteToken,
  getCurrentUser,
  inviteExpiry,
} from "@/lib/auth";
import { sendMail } from "@/lib/mail-graph";
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

  const baseUrl =
    process.env.PORTAL_PUBLIC_URL || "https://techbar.pinetwork.com.au";
  const resetLink = `${baseUrl}/set-password?token=${token}`;
  let mailSent = false;
  try {
    const result = await sendMail({
      to: u.email,
      subject: "PI Network — password reset link",
      body:
        `Hi ${u.name},\n\n` +
        `${me.name} has issued a password reset for your PI Network portal account.\n\n` +
        `Set a new password using the link below:\n` +
        `${resetLink}\n\n` +
        `This link expires in 7 days.\n\n` +
        `— PI Network`,
    });
    mailSent = !!result.ok;
  } catch {
    mailSent = false;
  }

  return NextResponse.json({ ok: true, inviteToken: token, mailSent });
}
