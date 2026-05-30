import "server-only";
import { promises as fs, readFileSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "chat-handoffs.json");

export interface ChatHandoff {
  id: string;
  siteId: string;
  siteName: string;
  userId: string;
  userEmail: string;
  requestedAt: string;
  status: "pending" | "claimed" | "resolved";
  reason?: string;
  /** Last few chat turns for context. Persisted as compact text. */
  transcript: string;
  claimedBy?: string;
  claimedAt?: string;
  resolvedAt?: string;
  /** Slack message ts of the original notification; used to thread updates. */
  slackThreadTs?: string;
}

let store: ChatHandoff[] = [];
try {
  store = JSON.parse(readFileSync(FILE, "utf8")) as ChatHandoff[];
} catch {
  store = [];
}

async function persist() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(store, null, 2));
  await fs.rename(tmp, FILE);
}

export async function createHandoff(
  h: Omit<ChatHandoff, "status">,
): Promise<ChatHandoff> {
  const full: ChatHandoff = { ...h, status: "pending" };
  store.unshift(full);
  await persist();
  return full;
}

export function listHandoffs(filter?: ChatHandoff["status"]): ChatHandoff[] {
  return filter ? store.filter((h) => h.status === filter) : store.slice();
}

export function pendingCount(): number {
  return store.filter((h) => h.status === "pending").length;
}

export function findHandoff(id: string): ChatHandoff | null {
  return store.find((h) => h.id === id) ?? null;
}

export async function updateHandoff(
  id: string,
  patch: Partial<ChatHandoff>,
): Promise<ChatHandoff | null> {
  const i = store.findIndex((h) => h.id === id);
  if (i === -1) return null;
  store[i] = { ...store[i], ...patch };
  await persist();
  return store[i];
}
