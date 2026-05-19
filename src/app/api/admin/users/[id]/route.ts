import { NextResponse } from "next/server";
import { getCurrentUser, hashPin, verifyPin } from "@/lib/auth";
import {
  listInvites,
  listUsers,
  saveInvites,
  saveUsers,
  type ServiceCategoryKey,
} from "@/lib/store";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json();
  const users = await listUsers();
  const u = users.find((x) => x.id === id);
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (typeof body.name === "string") u.name = body.name.trim();
  if (typeof body.role === "string") u.role = body.role.trim();
  if (typeof body.isAdmin === "boolean") {
    if (u.id === me.id && !body.isAdmin) {
      return NextResponse.json(
        { error: "Cannot remove admin from your own account" },
        { status: 400 },
      );
    }
    u.isAdmin = body.isAdmin;
  }
  if (typeof body.disabled === "boolean") {
    if (u.id === me.id && body.disabled) {
      return NextResponse.json(
        { error: "Cannot disable your own account" },
        { status: 400 },
      );
    }
    u.disabled = body.disabled;
  }
  if (body.permissions && typeof body.permissions === "object") {
    u.permissions = body.permissions as Record<string, ServiceCategoryKey[]>;
  }
  if (typeof body.pin === "string") {
    const pin = body.pin.trim();
    if (pin === "") {
      // explicit clear
      u.pinHash = null;
      u.pinSalt = null;
    } else if (/^\d{4,6}$/.test(pin)) {
      // collision check across active users
      const conflict = users.some(
        (x) =>
          x.id !== u.id &&
          !x.disabled &&
          !!x.pinHash &&
          !!x.pinSalt &&
          verifyPin(pin, x.pinHash, x.pinSalt),
      );
      if (conflict)
        return NextResponse.json(
          { error: "That PIN is already in use by another user" },
          { status: 409 },
        );
      const h = hashPin(pin);
      u.pinHash = h.hash;
      u.pinSalt = h.salt;
    } else {
      return NextResponse.json(
        { error: "PIN must be 4–6 digits, or empty to clear" },
        { status: 400 },
      );
    }
  }
  u.updatedAt = new Date().toISOString();
  await saveUsers(users);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  if (id === me.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 },
    );
  }
  const users = await listUsers();
  await saveUsers(users.filter((u) => u.id !== id));
  const invites = await listInvites();
  await saveInvites(invites.filter((i) => i.userId !== id));
  return NextResponse.json({ ok: true });
}
