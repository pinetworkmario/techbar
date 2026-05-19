import "server-only";
import { promises as fs, readFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "site-groups.json");

export interface SiteGroup {
  id: string;
  name: string;
  description?: string;
  siteIds: string[];
  createdAt: string;
  updatedAt: string;
}

let store: SiteGroup[] = [];
try {
  store = JSON.parse(readFileSync(FILE, "utf8")) as SiteGroup[];
} catch {
  store = [];
}

async function persist() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(store, null, 2));
  await fs.rename(tmp, FILE);
}

export function listSiteGroups(): SiteGroup[] {
  return store.slice();
}

export async function createSiteGroup(input: {
  name: string;
  description?: string;
  siteIds: string[];
}): Promise<SiteGroup> {
  const now = new Date().toISOString();
  const g: SiteGroup = {
    id: `sg-${randomBytes(4).toString("hex")}`,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    siteIds: Array.from(new Set(input.siteIds)),
    createdAt: now,
    updatedAt: now,
  };
  store.unshift(g);
  await persist();
  return g;
}

export async function updateSiteGroup(
  id: string,
  patch: Partial<Pick<SiteGroup, "name" | "description" | "siteIds">>,
): Promise<SiteGroup | null> {
  const i = store.findIndex((g) => g.id === id);
  if (i === -1) return null;
  const g = store[i];
  if (typeof patch.name === "string" && patch.name.trim()) g.name = patch.name.trim();
  if (patch.description !== undefined)
    g.description = patch.description?.trim() || undefined;
  if (Array.isArray(patch.siteIds))
    g.siteIds = Array.from(new Set(patch.siteIds));
  g.updatedAt = new Date().toISOString();
  await persist();
  return g;
}

export async function deleteSiteGroup(id: string): Promise<boolean> {
  const i = store.findIndex((g) => g.id === id);
  if (i === -1) return false;
  store.splice(i, 1);
  await persist();
  return true;
}
