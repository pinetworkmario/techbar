import "server-only";
import { promises as fs, readFileSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export interface PaymentCard {
  id: string;
  userId: string;
  brand: "Visa" | "Mastercard" | "Amex" | "Other";
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderName: string;
  isDefault: boolean;
  autopay: boolean;
  addedAt: string;
}

function loadSync<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path.join(DATA_DIR, name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export const paymentCards: PaymentCard[] = loadSync<PaymentCard[]>(
  "payment-cards.json",
  [],
);

async function atomicWrite(filename: string, content: string) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = path.join(DATA_DIR, filename + ".tmp");
  await fs.writeFile(tmp, content);
  await fs.rename(tmp, path.join(DATA_DIR, filename));
}

export async function persistCards(): Promise<void> {
  await atomicWrite("payment-cards.json", JSON.stringify(paymentCards, null, 2));
}
