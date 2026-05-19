import "server-only";
import { promises as fs, readFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import type { ActivityEntry } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "activity.json");
const MAX_ENTRIES = 500;

let store: ActivityEntry[] = [];
try {
  store = JSON.parse(readFileSync(FILE, "utf8")) as ActivityEntry[];
} catch {
  store = [];
}

async function persist() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(store, null, 2));
  await fs.rename(tmp, FILE);
}

/** Append a new activity entry. Trims the oldest beyond MAX_ENTRIES so the
 * file doesn't grow unbounded. Fire-and-forget — callers don't need to await. */
export async function recordActivity(
  kind: ActivityEntry["kind"],
  text: string,
): Promise<void> {
  const entry: ActivityEntry = {
    id: `act-${randomBytes(4).toString("hex")}`,
    at: new Date().toISOString(),
    text,
    kind,
  };
  store.unshift(entry);
  if (store.length > MAX_ENTRIES) store.length = MAX_ENTRIES;
  try {
    await persist();
  } catch {
    /* ignore — activity log is best-effort */
  }
}

export function listActivity(limit = 100): ActivityEntry[] {
  return store.slice(0, limit);
}
