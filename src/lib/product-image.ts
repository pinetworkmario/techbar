/**
 * Map a device brand+model to a representative product photo URL.
 * For prototype: use placehold.co with model name and category-coloured
 * background. Replace with real product photos by editing the lookup table
 * (or pointing to /uploads/products/{model}.jpg).
 */

const CATEGORY_COLOURS: Record<string, string> = {
  router: "1e40af", // blue
  switch: "059669", // green
  ap: "7c3aed", // purple
  pos: "ea580c", // orange
  voice: "0891b2", // cyan
  cctv: "be185d", // pink
  endpoint: "475569", // slate
  generic: "475569",
};

function categoryFromType(type: string): string {
  switch (type) {
    case "Router":
      return "router";
    case "Switch":
      return "switch";
    case "Wi-Fi AP":
      return "ap";
    case "POS Terminal":
    case "Payment Terminal":
    case "Receipt Printer":
    case "KDS":
    case "CDS":
    case "Android POS Device":
      return "pos";
    case "Phone Handset":
      return "voice";
    case "NVR":
    case "CCTV Camera":
    case "Alarm Panel":
      return "cctv";
    case "Windows PC":
    case "Server":
      return "endpoint";
    default:
      return "generic";
  }
}

/** Real product photo URLs by exact model name (downloaded into public/uploads/products/). */
const REAL_PRODUCT_PHOTOS: Record<string, string> = {
  "EG105GW(T)": "/uploads/products/eg105gw-t.png",
  "EG105G": "/uploads/products/eg105g.png",
  "EG105G-P": "/uploads/products/eg105g-p.png",
  "EG105G-P-V2": "/uploads/products/eg105g-p.png",
  "EG105GW-X": "/uploads/products/eg105gw-x.png",
  "EG2100-P": "/uploads/products/eg2100-p.png",
  "EG209GS": "/uploads/products/eg209gs.png",
  "EG305GH-P-E": "/uploads/products/eg305gh-p-e.png",
  "EG310GH-P-E": "/uploads/products/eg310gh-p-e.png",
  "ES205GC": "/uploads/products/es205gc.png",
  "ES205GC-P": "/uploads/products/es205gc-p.png",
  "ES208GC": "/uploads/products/es208gc.png",
  "ES209GC-P": "/uploads/products/es209gc-p.png",
  "ES206GC-P": "/uploads/products/es206gc-p.png",
  "NBS3100-24GT4SFP": "/uploads/products/nbs3100-24gt4sfp.png",
  "NBS3100-24GT4SFP-P": "/uploads/products/nbs3100-24gt4sfp-p.png",
  "RAP1200(F)": "/uploads/products/rap1200-f.png",
  "RAP2200(E)": "/uploads/products/rap2200-e.png",
  "RAP2200(F)": "/uploads/products/rap2200-f.png",
  "RAP2260(G)": "/uploads/products/rap2260-g.jpg",
  "AP720-L": "/uploads/products/ap720-l.png",
  "AP840-I": "/uploads/products/ap840-i.jpg",
};

export function productImageUrl(opts: {
  type?: string;
  model?: string;
  brand?: string;
}): string {
  const model = (opts.model || "").trim();
  if (model && REAL_PRODUCT_PHOTOS[model]) return REAL_PRODUCT_PHOTOS[model];
  const cat = categoryFromType(opts.type || "");
  const colour = CATEGORY_COLOURS[cat] || CATEGORY_COLOURS.generic;
  const label = encodeURIComponent(
    [opts.brand, model].filter(Boolean).join(" ") || "Device",
  );
  return `https://placehold.co/800x520/${colour}/ffffff/png?text=${label}`;
}
