import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(name: string, fallback: T): Promise<T> {
  await ensureDir();
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, name), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(name: string, data: T): Promise<void> {
  await ensureDir();
  const tmp = path.join(DATA_DIR, name + ".tmp");
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, path.join(DATA_DIR, name));
}

export type ServiceCategoryKey =
  | "network"
  | "voice"
  | "cctv"
  | "pos"
  | "endpoint"
  | "it_support"
  | "projects"
  | "traffic_analysis";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
  /** Internal PI Network tech support staff — gets /tech/* access. Admins also implicitly get it. */
  isTech?: boolean;
  /** "admin" = top-level customer contact (manages sub-contacts); "user" = sub-contact under a customer admin. Irrelevant for internal users. */
  customerRole?: "admin" | "user";
  passwordHash: string | null;
  passwordSalt: string | null;
  disabled: boolean;
  permissions: Record<string, ServiceCategoryKey[]>;
  /** null = top-level user (PI Network admin or Customer admin). Non-null = sub-contact under that user; sub-contacts cannot create more contacts. */
  parentUserId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Onsite/iPad quick login PIN. 4–6 digits, hashed with scrypt (same
   * mechanism as passwords). Optional — users without PIN can't use /onsite. */
  pinHash?: string | null;
  pinSalt?: string | null;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface Invite {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface DeviceOverride {
  assetNumber?: string;
  photoUrl?: string;
  /** Admin-authored notes — surfaced on the customer "More Details" page so
   * onsite staff can find / handle the device. */
  notes?: string;
  /** Additional location / context photos beyond the primary photoUrl on the
   * Device record. Each entry is a /uploads/devices/... URL. */
  gallery?: string[];
}

export interface ResetRequest {
  id: string;
  userId: string;
  email: string;
  inviteToken: string;
  inviteExpiresAt: string;
  createdAt: string;
  ip?: string;
}

// ---- Users ----
export async function listUsers(): Promise<User[]> {
  return readJson("users.json", []);
}
export async function saveUsers(u: User[]): Promise<void> {
  await writeJson("users.json", u);
}
export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await listUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}
export async function findUserById(id: string): Promise<User | null> {
  const users = await listUsers();
  return users.find((u) => u.id === id) ?? null;
}

/** Find a user whose PIN (hashed) matches. Linear scan — fine for the
 * small user count this portal supports. */
export async function findUserByPin(
  verify: (hash: string, salt: string) => boolean,
): Promise<User | null> {
  const users = await listUsers();
  for (const u of users) {
    if (u.disabled) continue;
    if (!u.pinHash || !u.pinSalt) continue;
    if (verify(u.pinHash, u.pinSalt)) return u;
  }
  return null;
}

// ---- Sessions ----
export async function listSessions(): Promise<Session[]> {
  return readJson("sessions.json", []);
}
export async function saveSessions(s: Session[]): Promise<void> {
  await writeJson("sessions.json", s);
}
export async function findSession(token: string): Promise<Session | null> {
  const sessions = await listSessions();
  const now = new Date().toISOString();
  return sessions.find((s) => s.token === token && s.expiresAt > now) ?? null;
}

// ---- Invites ----
export async function listInvites(): Promise<Invite[]> {
  return readJson("invites.json", []);
}
export async function saveInvites(i: Invite[]): Promise<void> {
  await writeJson("invites.json", i);
}
export async function findInvite(token: string): Promise<Invite | null> {
  const inv = await listInvites();
  const now = new Date().toISOString();
  return inv.find((i) => i.token === token && i.expiresAt > now) ?? null;
}

// ---- Device overrides ----
export async function getDeviceOverrides(): Promise<Record<string, DeviceOverride>> {
  return readJson("device-overrides.json", {});
}
export async function saveDeviceOverrides(
  o: Record<string, DeviceOverride>,
): Promise<void> {
  await writeJson("device-overrides.json", o);
}

// ---- Reset requests ----
export async function listResetRequests(): Promise<ResetRequest[]> {
  return readJson("reset-requests.json", []);
}
export async function saveResetRequests(r: ResetRequest[]): Promise<void> {
  await writeJson("reset-requests.json", r);
}
