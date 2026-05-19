import "server-only";
import { promises as fs, readFileSync } from "fs";
import path from "path";
import {
  devices,
  helpArticles,
  maintenanceItems,
  projects,
  sites,
  tickets,
} from "./data";
import type {
  Device,
  HelpArticle,
  MaintenanceItem,
  Project,
  Site,
  Ticket,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function loadSync<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(
      readFileSync(path.join(DATA_DIR, name), "utf8"),
    ) as T;
  } catch {
    return fallback;
  }
}

// One-shot population at module init. Module is cached by Node, so this
// only runs once per server process — exactly what we want.
const persistedSites = loadSync<Site[]>("sites.json", []);
const persistedDevices = loadSync<Device[]>("devices.json", []);
const persistedTickets = loadSync<Ticket[]>("tickets.json", []);
const persistedProjects = loadSync<Project[]>("projects.json", []);
const persistedMaint = loadSync<MaintenanceItem[]>("maintenance.json", []);
const persistedHelp = loadSync<HelpArticle[]>("help-articles.json", []);
// helpArticles aren't wiped by data.ts (unlike sites/devices/tickets/etc.),
// so clear before push to avoid duplicating the demo seed.
helpArticles.length = 0;
sites.push(...persistedSites);
devices.push(...persistedDevices);
tickets.push(...persistedTickets);
projects.push(...persistedProjects);
maintenanceItems.push(...persistedMaint);
helpArticles.push(...persistedHelp);

async function atomicWrite(filename: string, content: string) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = path.join(DATA_DIR, filename + ".tmp");
  await fs.writeFile(tmp, content);
  await fs.rename(tmp, path.join(DATA_DIR, filename));
}

export async function persistSites(): Promise<void> {
  await atomicWrite("sites.json", JSON.stringify(sites, null, 2));
}

export async function persistDevices(): Promise<void> {
  await atomicWrite("devices.json", JSON.stringify(devices, null, 2));
}

export async function persistTickets(): Promise<void> {
  await atomicWrite("tickets.json", JSON.stringify(tickets, null, 2));
}

export async function persistProjects(): Promise<void> {
  await atomicWrite("projects.json", JSON.stringify(projects, null, 2));
}

export async function persistMaintenance(): Promise<void> {
  await atomicWrite(
    "maintenance.json",
    JSON.stringify(maintenanceItems, null, 2),
  );
}

export async function persistHelpArticles(): Promise<void> {
  await atomicWrite(
    "help-articles.json",
    JSON.stringify(helpArticles, null, 2),
  );
}
