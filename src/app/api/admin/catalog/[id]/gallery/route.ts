import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { catalog, persistCatalog } from "@/lib/store-catalog";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_GALLERY = 8;
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function dir() {
  return path.join(process.cwd(), "public", "uploads", "catalog");
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const item = catalog.find((c) => c.id === id);
  if (!item)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const gallery = item.gallery ?? [];
  if (gallery.length >= MAX_GALLERY)
    return NextResponse.json(
      { error: `Gallery limit reached (${MAX_GALLERY})` },
      { status: 400 },
    );

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "file required" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json(
      { error: "File too large (max 5 MB)" },
      { status: 400 },
    );
  const ext = EXT_BY_MIME[file.type];
  if (!ext)
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP or GIF" },
      { status: 400 },
    );

  const filename = `${safeId}-gallery-${Date.now()}.${ext}`;
  const d = dir();
  await fs.mkdir(d, { recursive: true });
  await fs.writeFile(
    path.join(d, filename),
    Buffer.from(await file.arrayBuffer()),
  );
  const url = `/uploads/catalog/${filename}`;
  item.gallery = [...gallery, url];
  await persistCatalog();
  return NextResponse.json({ ok: true, url, gallery: item.gallery });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const item = catalog.find((c) => c.id === id);
  if (!item)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !url.startsWith("/uploads/catalog/"))
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  if (!item.gallery?.includes(url))
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  item.gallery = item.gallery.filter((u) => u !== url);
  if (item.gallery.length === 0) item.gallery = undefined;
  await persistCatalog();
  try {
    await fs.unlink(path.join(process.cwd(), "public", url));
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true, gallery: item.gallery ?? [] });
}
