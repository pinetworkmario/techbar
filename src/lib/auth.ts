import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  findSession,
  findUserById,
  listSessions,
  saveSessions,
  type ServiceCategoryKey,
  type User,
} from "./store";

export const SESSION_COOKIE = "pi_sid";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): boolean {
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}

/** PIN is 4–6 digits, hashed with the same scrypt machinery as passwords. */
export function hashPin(pin: string): { hash: string; salt: string } {
  return hashPassword(pin);
}
export function verifyPin(pin: string, hash: string, salt: string): boolean {
  return verifyPassword(pin, hash, salt);
}

export async function createSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const sessions = await listSessions();
  const fresh = sessions.filter((s) => s.expiresAt > now.toISOString());
  fresh.push({
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
  await saveSessions(fresh);
  return { token, expiresAt };
}

export async function destroySession(token: string): Promise<void> {
  const sessions = await listSessions();
  await saveSessions(sessions.filter((s) => s.token !== token));
}

export async function getCurrentUser(): Promise<User | null> {
  const c = await cookies();
  const tok = c.get(SESSION_COOKIE)?.value;
  if (!tok) return null;
  const sess = await findSession(tok);
  if (!sess) return null;
  const user = await findUserById(sess.userId);
  if (!user || user.disabled) return null;
  return user;
}

export function cookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: process.env.PORTAL_HTTPS === "1",
    sameSite: "lax" as const,
    path: "/",
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export function generateInviteToken(): string {
  return randomBytes(24).toString("hex");
}

export function inviteExpiry(): string {
  return new Date(Date.now() + INVITE_TTL_MS).toISOString();
}

export function canAccessSite(user: User, siteId: string): boolean {
  if (user.isAdmin) return true;
  return Object.prototype.hasOwnProperty.call(user.permissions, siteId);
}

export function canAccessModule(
  user: User,
  siteId: string,
  mod: ServiceCategoryKey,
): boolean {
  if (user.isAdmin) return true;
  return user.permissions[siteId]?.includes(mod) ?? false;
}

export function allowedSiteIds(user: User, allSiteIds: string[]): string[] {
  if (user.isAdmin) return allSiteIds;
  return allSiteIds.filter((id) => canAccessSite(user, id));
}

export function allowedModulesForSite(
  user: User,
  siteId: string,
): ServiceCategoryKey[] {
  if (user.isAdmin) {
    return [
      "network",
      "voice",
      "cctv",
      "pos",
      "endpoint",
      "it_support",
      "projects",
      "traffic_analysis",
    ];
  }
  return user.permissions[siteId] ?? [];
}
