import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { catalog, persistCatalog } from "@/lib/store-catalog";
import type {
  BillingPeriod,
  CatalogCategory,
  CatalogItem,
  StockStatus,
} from "@/lib/catalog-types";

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
const VALID_STOCK: StockStatus[] = [
  "in_stock",
  "low_stock",
  "out_of_stock",
  "made_to_order",
];

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const item = catalog.find((c) => c.id === id);
  if (!item)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as Partial<CatalogItem>;
  if (typeof b.name === "string") item.name = b.name.trim();
  if (typeof b.sku === "string") {
    const sku = b.sku.trim();
    if (sku !== item.sku && catalog.some((c) => c.sku === sku))
      return NextResponse.json(
        { error: `SKU "${sku}" already exists` },
        { status: 409 },
      );
    item.sku = sku;
  }
  if (typeof b.description === "string") item.description = b.description.trim();
  if (
    typeof b.category === "string" &&
    VALID_CATEGORIES.includes(b.category as CatalogCategory)
  )
    item.category = b.category as CatalogCategory;
  if (
    typeof b.billing === "string" &&
    VALID_BILLING.includes(b.billing as BillingPeriod)
  )
    item.billing = b.billing as BillingPeriod;
  if (typeof b.priceAud === "number" && Number.isFinite(b.priceAud) && b.priceAud >= 0)
    item.priceAud = b.priceAud;
  if (typeof b.siteScoped === "boolean") item.siteScoped = b.siteScoped;
  if (typeof b.active === "boolean") item.active = b.active;
  if (typeof b.brand === "string") {
    const v = b.brand.trim();
    item.brand = v || undefined;
  }
  if (typeof b.longDescription === "string") {
    const v = b.longDescription;
    item.longDescription = v || undefined;
  }
  if (typeof b.leadTimeDays === "number" && b.leadTimeDays >= 0)
    item.leadTimeDays = b.leadTimeDays;
  if (b.leadTimeDays === null) item.leadTimeDays = undefined;
  if (
    typeof b.stockStatus === "string" &&
    VALID_STOCK.includes(b.stockStatus as StockStatus)
  )
    item.stockStatus = b.stockStatus as StockStatus;
  if (b.stockStatus === null) item.stockStatus = undefined;
  if (typeof b.featured === "boolean") item.featured = b.featured;
  if (typeof b.minQty === "number" && b.minQty >= 1)
    item.minQty = Math.floor(b.minQty);
  if (typeof b.maxQty === "number" && b.maxQty >= 1)
    item.maxQty = Math.floor(b.maxQty);
  if (Array.isArray(b.tags)) {
    item.tags = b.tags
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean);
    if (item.tags.length === 0) item.tags = undefined;
  }

  await persistCatalog();
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const i = catalog.findIndex((c) => c.id === id);
  if (i === -1)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  catalog.splice(i, 1);
  await persistCatalog();
  return NextResponse.json({ ok: true });
}
