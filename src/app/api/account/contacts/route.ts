import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
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
  type ServiceCategoryKey,
  type User,
} from "@/lib/store";

interface PublicContact {
  id: string;
  email: string;
  name: string;
  role: string;
  disabled: boolean;
  hasPassword: boolean;
  permissions: Record<string, ServiceCategoryKey[]>;
  createdAt: string;
}

function shape(u: User): PublicContact {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    disabled: u.disabled,
    hasPassword: !!u.passwordHash,
    permissions: u.permissions,
    createdAt: u.createdAt,
  };
}

function isSubsetOfParent(
  child: Record<string, ServiceCategoryKey[]>,
  parent: User,
): boolean {
  if (parent.isAdmin) return true;
  for (const [siteId, mods] of Object.entries(child)) {
    const parentMods = parent.permissions[siteId];
    if (!parentMods) return false;
    for (const m of mods) {
      if (!parentMods.includes(m)) return false;
    }
  }
  return true;
}

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (me.parentUserId) {
    return NextResponse.json(
      { error: "Sub-contacts cannot manage further accounts" },
      { status: 403 },
    );
  }
  const users = await listUsers();
  const contacts = users.filter((u) => u.parentUserId === me.id);
  return NextResponse.json({ contacts: contacts.map(shape) });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (me.parentUserId) {
    return NextResponse.json(
      { error: "Sub-contacts cannot manage further accounts" },
      { status: 403 },
    );
  }
  const body = await req.json();
  const email = String(body.email || "").trim();
  const name = String(body.name || "").trim();
  const role = String(body.role || "Contact").trim();
  const permissions =
    body.permissions && typeof body.permissions === "object"
      ? (body.permissions as Record<string, ServiceCategoryKey[]>)
      : {};
  if (!email || !name) {
    return NextResponse.json(
      { error: "Email and name are required" },
      { status: 400 },
    );
  }
  if (!isSubsetOfParent(permissions, me)) {
    return NextResponse.json(
      {
        error:
          "Cannot grant permissions you do not have yourself. Pick from your own sites/modules.",
      },
      { status: 400 },
    );
  }
  const users = await listUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }
  const id = "u-" + randomBytes(8).toString("hex");
  const now = new Date().toISOString();
  const user: User = {
    id,
    email,
    name,
    role,
    isAdmin: false,
    passwordHash: null,
    passwordSalt: null,
    disabled: false,
    permissions,
    parentUserId: me.id,
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  await saveUsers(users);
  const token = generateInviteToken();
  const invites = await listInvites();
  invites.push({ token, userId: id, expiresAt: inviteExpiry() });
  await saveInvites(invites);
  return NextResponse.json({ ok: true, contact: shape(user), inviteToken: token });
}
