export type CatalogCategory =
  | "network"
  | "voice"
  | "pos"
  | "cctv"
  | "endpoint"
  | "it_support"
  | "materials";

export type BillingPeriod = "one_off" | "monthly";

export type StockStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "made_to_order";

export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  category: CatalogCategory;
  /** Short blurb shown on cards. */
  description: string;
  priceAud: number;
  billing: BillingPeriod;
  siteScoped: boolean;
  active?: boolean;
  /** Manufacturer / brand. Surfaced as small label on the card. */
  brand?: string;
  /** Primary product image (web path, e.g. /uploads/catalog/<sku>-<ts>.jpg). */
  imageUrl?: string;
  /** Additional product images. */
  gallery?: string[];
  /** Markdown body for the product detail page. */
  longDescription?: string;
  /** Indicative lead time before fulfilment. */
  leadTimeDays?: number;
  /** Inventory hint shown to customers. */
  stockStatus?: StockStatus;
  /** Free-form tags for facets / search. */
  tags?: string[];
  /** Featured items can be promoted on the Store landing. */
  featured?: boolean;
  /** Min/max qty per order. Default 1 / 100 server-side. */
  minQty?: number;
  maxQty?: number;
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  made_to_order: "Made to order",
};

export type OrderStatus =
  | "Pending"
  | "Quoted"
  | "Approved"
  | "Completed"
  | "Rejected";

export interface OrderLine {
  itemId: string;
  sku: string;
  name: string;
  category: CatalogCategory;
  priceAud: number;
  billing: BillingPeriod;
  qty: number;
  siteId?: string;
  siteName?: string;
}

export interface Order {
  id: string;
  number: string;
  userId: string;
  userEmail: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  oneOffSubtotalAud: number;
  monthlySubtotalAud: number;
  customerNote?: string;
  adminNote?: string;
}

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  network: "Network",
  voice: "Voice",
  pos: "POS & Payments",
  cctv: "CCTV & Alarm",
  endpoint: "Endpoint",
  it_support: "IT Support",
  materials: "Materials",
};
