import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { generateInviteToken, inviteExpiry } from "@/lib/auth";
import {
  findUserByEmail,
  listInvites,
  listResetRequests,
  saveInvites,
  saveResetRequests,
} from "@/lib/store";

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const email = String(body.email || "").trim();

  if (email) {
    const user = await findUserByEmail(email);
    if (user && !user.disabled) {
      const token = generateInviteToken();
      const expiresAt = inviteExpiry();
      // Add to invites (don't remove existing — old invites stay valid until used or expired)
      const invites = await listInvites();
      invites.push({ token, userId: user.id, expiresAt });
      await saveInvites(invites);
      // Record the request so admin sees it
      const requests = await listResetRequests();
      // Drop any older pending request for the same user — admin only needs the latest
      const filtered = requests.filter((r) => r.userId !== user.id);
      filtered.push({
        id: "rr-" + randomBytes(8).toString("hex"),
        userId: user.id,
        email: user.email,
        inviteToken: token,
        inviteExpiresAt: expiresAt,
        createdAt: new Date().toISOString(),
        ip:
          req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
          undefined,
      });
      await saveResetRequests(filtered);
    }
  }

  // Always respond identically to avoid email enumeration
  return NextResponse.json({ ok: true });
}
