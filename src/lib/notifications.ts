import "server-only";
import { promises as fs, readFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "notifications.json");
const MAX_PER_USER = 100;

export interface Notification {
  id: string;
  userId: string;
  kind:
    | "ticket_comment"
    | "ticket_status"
    | "order_status"
    | "project_status"
    | "system";
  text: string;
  /** Optional link to deep-jump (e.g. `/portal/tickets?focus=PI-1042`). */
  link?: string;
  read: boolean;
  createdAt: string;
}

let store: Record<string, Notification[]> = {};
try {
  store = JSON.parse(readFileSync(FILE, "utf8")) as Record<
    string,
    Notification[]
  >;
} catch {
  store = {};
}

async function persist() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(store, null, 2));
  await fs.rename(tmp, FILE);
}

export async function notify(
  userId: string,
  kind: Notification["kind"],
  text: string,
  link?: string,
): Promise<void> {
  if (!userId) return;
  const list = store[userId] ?? [];
  list.unshift({
    id: `n-${randomBytes(4).toString("hex")}`,
    userId,
    kind,
    text,
    link,
    read: false,
    createdAt: new Date().toISOString(),
  });
  if (list.length > MAX_PER_USER) list.length = MAX_PER_USER;
  store[userId] = list;
  try {
    await persist();
  } catch {
    /* best-effort */
  }
}

/** Fan out a notification to many user IDs (e.g. when admin changes a
 * ticket: notify all customers with access to that ticket's site). */
export async function notifyMany(
  userIds: string[],
  kind: Notification["kind"],
  text: string,
  link?: string,
): Promise<void> {
  for (const uid of new Set(userIds)) {
    await notify(uid, kind, text, link);
  }
}

export function listNotifications(
  userId: string,
  opts: { onlyUnread?: boolean; limit?: number } = {},
): Notification[] {
  let list = (store[userId] ?? []).slice();
  if (opts.onlyUnread) list = list.filter((n) => !n.read);
  if (opts.limit) list = list.slice(0, opts.limit);
  return list;
}

export function unreadCount(userId: string): number {
  return (store[userId] ?? []).filter((n) => !n.read).length;
}

export async function markRead(
  userId: string,
  ids: string[] | "all",
): Promise<void> {
  const list = store[userId] ?? [];
  if (ids === "all") {
    for (const n of list) n.read = true;
  } else {
    const set = new Set(ids);
    for (const n of list) if (set.has(n.id)) n.read = true;
  }
  await persist();
}
