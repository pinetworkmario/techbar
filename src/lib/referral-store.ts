import "server-only";
import { promises as fs, readFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import type {
  BillingCredit,
  ReferralActivity,
  ReferralProgram,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "referral.json");

const EMPTY_CREDIT: BillingCredit = {
  available: 0,
  pending: 0,
  used: 0,
  nextInvoiceCredit: 0,
};

const DEFAULT: ReferralProgram = {
  code: "",
  link: "",
  credit: { ...EMPTY_CREDIT },
  activity: [],
};

let store: ReferralProgram = (() => {
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as ReferralProgram;
  } catch {
    return { ...DEFAULT, credit: { ...EMPTY_CREDIT }, activity: [] };
  }
})();

async function persist() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(store, null, 2));
  await fs.rename(tmp, FILE);
}

export function getReferralProgram(): ReferralProgram {
  return JSON.parse(JSON.stringify(store)) as ReferralProgram;
}

export async function setReferralProgramMeta(patch: {
  code?: string;
  link?: string;
  credit?: Partial<BillingCredit>;
}): Promise<ReferralProgram> {
  if (typeof patch.code === "string") store.code = patch.code.trim();
  if (typeof patch.link === "string") store.link = patch.link.trim();
  if (patch.credit) {
    for (const k of [
      "available",
      "pending",
      "used",
      "nextInvoiceCredit",
    ] as const) {
      const v = patch.credit[k];
      if (typeof v === "number" && Number.isFinite(v))
        store.credit[k] = Math.max(0, v);
    }
  }
  await persist();
  return getReferralProgram();
}

export async function addReferralActivity(
  input: Omit<ReferralActivity, "id">,
): Promise<ReferralActivity> {
  const a: ReferralActivity = {
    id: `r-${randomBytes(4).toString("hex")}`,
    ...input,
  };
  store.activity.unshift(a);
  await persist();
  return a;
}

export async function updateReferralActivity(
  id: string,
  patch: Partial<ReferralActivity>,
): Promise<ReferralActivity | null> {
  const i = store.activity.findIndex((x) => x.id === id);
  if (i === -1) return null;
  const a = store.activity[i];
  if (typeof patch.referredBusiness === "string")
    a.referredBusiness = patch.referredBusiness.trim();
  if (typeof patch.eligibleService === "string")
    a.eligibleService = patch.eligibleService.trim();
  if (
    typeof patch.status === "string" &&
    ["Invited", "Contacted", "Purchased", "Credit Applied"].includes(
      patch.status,
    )
  )
    a.status = patch.status as ReferralActivity["status"];
  if (typeof patch.creditAmount === "number")
    a.creditAmount = Math.max(0, patch.creditAmount);
  if (typeof patch.date === "string") a.date = patch.date.slice(0, 10);
  await persist();
  return a;
}

export async function deleteReferralActivity(id: string): Promise<boolean> {
  const i = store.activity.findIndex((x) => x.id === id);
  if (i === -1) return false;
  store.activity.splice(i, 1);
  await persist();
  return true;
}
