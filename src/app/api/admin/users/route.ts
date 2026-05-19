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

interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
  disabled: boolean;
  hasPassword: boolean;
  hasPin: boolean;
  permissions: Record<string, ServiceCategoryKey[]>;
  parentUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

function publicShape(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isAdmin: u.isAdmin,
    disabled: u.disabled,
    hasPassword: !!u.passwordHash,
    hasPin: !!u.pinHash,
    permissions: u.permissions,
    parentUserId: u.parentUserId,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export async function GET() {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await listUsers();
  return NextResponse.json({ users: users.map(publicShape) });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const email = String(body.email || "").trim();
  const name = String(body.name || "").trim();
  const role = String(body.role || "Customer").trim();
  const isAdmin = !!body.isAdmin;
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
  const users = await listUsers();
  if (
    users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  ) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }
  const id = "u-" + randomBytes(8).toString("hex");
  const now = new Date().toISOString();
  const user: User = {
    id,
    email,
    name,
    role,
    isAdmin,
    passwordHash: null,
    passwordSalt: null,
    disabled: false,
    permissions,
    parentUserId: null,
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  await saveUsers(users);
  const token = generateInviteToken();
  const invites = await listInvites();
  invites.push({ token, userId: id, expiresAt: inviteExpiry() });
  await saveInvites(invites);
  return NextResponse.json({ ok: true, user: publicShape(user), inviteToken: token });
}
