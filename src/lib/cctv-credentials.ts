import "server-only";
import { promises as fs, readFileSync } from "fs";
import path from "path";
import type { CctvCredentials } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "cctv-credentials.json");

let store: Record<string, CctvCredentials> = {};
try {
  store = JSON.parse(readFileSync(FILE, "utf8"));
} catch {
  store = {};
}

async function persist() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), { mode: 0o600 });
  await fs.rename(tmp, FILE);
}

export async function setCctvCredentials(
  siteId: string,
  patch: Partial<CctvCredentials>,
): Promise<void> {
  const prev = store[siteId] ?? {};
  store[siteId] = {
    cameraPassword: patch.cameraPassword ?? prev.cameraPassword,
    alarmPassword: patch.alarmPassword ?? prev.alarmPassword,
    cameraUser: patch.cameraUser ?? prev.cameraUser,
    alarmUser: patch.alarmUser ?? prev.alarmUser,
    updatedAt: new Date().toISOString(),
  };
  await persist();
}

export function getCctvCredentials(siteId: string): CctvCredentials | undefined {
  return store[siteId];
}

export async function clearCctvCredentials(siteId: string): Promise<void> {
  if (store[siteId]) {
    delete store[siteId];
    await persist();
  }
}
