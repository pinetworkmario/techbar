import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
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
  type ServiceCategoryKey,
  type User,
} from "@/lib/store";

type EffectiveRole = "admin" | "tech" | "customer_admin" | "customer_user";

function labelForRole(r: EffectiveRole): string {
  switch (r) {
    case "admin":
      return "Administrator";
    case "tech":
      return "Tech Support";
    case "customer_admin":
      return "Customer Admin";
    case "customer_user":
      return "Customer User";
  }
}

interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
  isTech: boolean;
  customerRole: "admin" | "user" | null;
  effectiveRole: EffectiveRole;
  disabled: boolean;
  hasPassword: boolean;
  hasPin: boolean;
  permissions: Record<string, ServiceCategoryKey[]>;
  parentUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

function deriveEffective(u: User): EffectiveRole {
  if (u.isAdmin) return "admin";
  if (u.isTech) return "tech";
  if (u.customerRole === "user" || (!u.customerRole && u.parentUserId)) return "customer_user";
  return "customer_admin";
}

function publicShape(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isAdmin: u.isAdmin,
    isTech: !!u.isTech,
    customerRole: u.customerRole ?? null,
    effectiveRole: deriveEffective(u),
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
  // effectiveRole drives isAdmin / isTech / customerRole. Fallback to legacy
  // isAdmin boolean for callers that haven't been updated yet.
  const er = String(body.effectiveRole || "").trim();
  const validRoles: EffectiveRole[] = ["admin", "tech", "customer_admin", "customer_user"];
  const effective: EffectiveRole = (validRoles as string[]).includes(er)
    ? (er as EffectiveRole)
    : body.isAdmin
      ? "admin"
      : "customer_admin";
  const isAdmin = effective === "admin";
  const isTech = effective === "tech";
  const customerRole: "admin" | "user" | undefined =
    effective === "customer_admin"
      ? "admin"
      : effective === "customer_user"
        ? "user"
        : undefined;
  const role = String(body.role || labelForRole(effective)).trim();
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
  // For customer_user role, parentUserId is required and must point to an
  // existing customer_admin. Otherwise gates that key off parentUserId would
  // mis-classify the new account.
  let parentUserId: string | null = null;
  if (effective === "customer_user") {
    const pid = typeof body.parentUserId === "string" ? body.parentUserId.trim() : "";
    if (!pid) {
      return NextResponse.json(
        { error: "customer_user requires a valid parent customer_admin" },
        { status: 400 },
      );
    }
    const parent = users.find((u) => u.id === pid);
    if (!parent || deriveEffective(parent) !== "customer_admin") {
      return NextResponse.json(
        { error: "customer_user requires a valid parent customer_admin" },
        { status: 400 },
      );
    }
    parentUserId = pid;
  }
  const id = "u-" + randomBytes(8).toString("hex");
  const now = new Date().toISOString();
  const user: User = {
    id,
    email,
    name,
    role,
    isAdmin,
    isTech: isTech || undefined,
    customerRole,
    passwordHash: null,
    passwordSalt: null,
    disabled: false,
    permissions,
    parentUserId,
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  await saveUsers(users);
  const token = generateInviteToken();
  const invites = await listInvites();
  invites.push({ token, userId: id, expiresAt: inviteExpiry() });
  await saveInvites(invites);

  const baseUrl =
    process.env.PORTAL_PUBLIC_URL || "https://techbar.pinetwork.com.au";
  const activationLink = `${baseUrl}/set-password?token=${token}`;
  let mailSent = false;
  try {
    const result = await sendMail({
      to: email,
      subject: "Welcome to PI Network — set your password",
      body:
        `Hi ${name},\n\n` +
        `${me.name} has invited you to the PI Network customer portal.\n\n` +
        `To activate your account, set your password using the link below:\n` +
        `${activationLink}\n\n` +
        `This link expires in 7 days.\n\n` +
        `— PI Network`,
    });
    mailSent = !!result.ok;
  } catch {
    mailSent = false;
  }

  return NextResponse.json({
    ok: true,
    user: publicShape(user),
    inviteToken: token,
    mailSent,
  });
}
