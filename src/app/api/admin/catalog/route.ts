import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { catalog, persistCatalog } from "@/lib/store-catalog";
import type {
  BillingPeriod,
  CatalogCategory,
  CatalogItem,
  StockStatus,
} from "@/lib/catalog-types";

const VALID_STOCK: StockStatus[] = [
  "in_stock",
  "low_stock",
  "out_of_stock",
  "made_to_order",
];

const VALID_CATEGORIES: CatalogCategory[] = [
  "network",
  "voice",
  "pos",
  "cctv",
  "endpoint",
  "it_support",
  "materials",
];
const VALID_BILLING: BillingPeriod[] = ["one_off", "monthly"];

function trim(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function GET() {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ items: catalog });
}

/** Single-letter SKU prefix per category. Customer-facing — keep short so
 * support staff can dictate "N-4560" over the phone. */
const SKU_PREFIX: Record<CatalogCategory, string> = {
  network: "N",
  voice: "V",
  pos: "P",
  cctv: "C",
  endpoint: "E",
  it_support: "I",
  materials: "M",
};

/** Generate a unique SKU like "N-4560" — category prefix + 4 random digits.
 * 9000 combinations per category, plenty for a small catalog. Retries on
 * collision. */
function generateSku(category: CatalogCategory): string {
  const prefix = SKU_PREFIX[category] ?? "X";
  for (let i = 0; i < 50; i++) {
    const num = 1000 + Math.floor(Math.random() * 9000);
    const sku = `${prefix}-${num}`;
    if (!catalog.some((c) => c.sku === sku)) return sku;
  }
  throw new Error(
    `Could not generate unique SKU for category "${category}" — pool may be exhausted`,
  );
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Partial<CatalogItem>;
  const name = trim(b.name);
  const skuInput = trim(b.sku);
  const description = trim(b.description);
  const category = b.category as CatalogCategory;
  const billing = b.billing as BillingPeriod;
  const priceAud =
    typeof b.priceAud === "number" && Number.isFinite(b.priceAud) ? b.priceAud : NaN;

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!VALID_CATEGORIES.includes(category))
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  if (!VALID_BILLING.includes(billing))
    return NextResponse.json({ error: "invalid billing" }, { status: 400 });
  if (!Number.isFinite(priceAud) || priceAud < 0)
    return NextResponse.json({ error: "invalid priceAud" }, { status: 400 });

  // Use admin-supplied SKU if provided + non-colliding; otherwise auto-generate.
  let sku = skuInput;
  if (sku && catalog.some((c) => c.sku === sku))
    return NextResponse.json({ error: `SKU "${sku}" already exists` }, { status: 409 });
  if (!sku) sku = generateSku(category);

  const item: CatalogItem = {
    id: `cat-${randomBytes(4).toString("hex")}`,
    sku,
    name,
    category,
    description,
    priceAud,
    billing,
    siteScoped: b.siteScoped !== false,
    active: b.active !== false,
    brand: trim(b.brand) || undefined,
    longDescription:
      typeof b.longDescription === "string" && b.longDescription
        ? b.longDescription
        : undefined,
    leadTimeDays:
      typeof b.leadTimeDays === "number" && b.leadTimeDays >= 0
        ? b.leadTimeDays
        : undefined,
    stockStatus: VALID_STOCK.includes(b.stockStatus as StockStatus)
      ? (b.stockStatus as StockStatus)
      : undefined,
    featured: b.featured === true,
    minQty: typeof b.minQty === "number" && b.minQty >= 1 ? Math.floor(b.minQty) : undefined,
    maxQty: typeof b.maxQty === "number" && b.maxQty >= 1 ? Math.floor(b.maxQty) : undefined,
    tags: Array.isArray(b.tags)
      ? (b.tags as unknown[])
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined,
  };
  catalog.unshift(item);
  await persistCatalog();
  return NextResponse.json({ ok: true, item });
}
