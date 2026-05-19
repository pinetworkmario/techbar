import "server-only";
import { promises as fs, readFileSync } from "fs";
import path from "path";
import type { CatalogItem, Order } from "./catalog-types";

const DATA_DIR = path.join(process.cwd(), "data");

function loadSync<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path.join(DATA_DIR, name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export const catalog: CatalogItem[] = loadSync<CatalogItem[]>(
  "catalog.json",
  [],
);
export const orders: Order[] = loadSync<Order[]>("orders.json", []);

async function atomicWrite(filename: string, content: string) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = path.join(DATA_DIR, filename + ".tmp");
  await fs.writeFile(tmp, content);
  await fs.rename(tmp, path.join(DATA_DIR, filename));
}

export async function persistOrders(): Promise<void> {
  await atomicWrite("orders.json", JSON.stringify(orders, null, 2));
}

export async function persistCatalog(): Promise<void> {
  await atomicWrite("catalog.json", JSON.stringify(catalog, null, 2));
}
