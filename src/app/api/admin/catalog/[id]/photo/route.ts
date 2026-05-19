import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { catalog, persistCatalog } from "@/lib/store-catalog";

const MAX_BYTES = 5 * 1024 * 1024;
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

  const filename = `${safeId}-${Date.now()}.${ext}`;
  const d = dir();
  await fs.mkdir(d, { recursive: true });
  await fs.writeFile(
    path.join(d, filename),
    Buffer.from(await file.arrayBuffer()),
  );

  if (item.imageUrl?.startsWith("/uploads/catalog/")) {
    try {
      await fs.unlink(path.join(process.cwd(), "public", item.imageUrl));
    } catch {
      /* ignore */
    }
  }
  item.imageUrl = `/uploads/catalog/${filename}`;
  await persistCatalog();
  return NextResponse.json({ ok: true, url: item.imageUrl });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const item = catalog.find((c) => c.id === id);
  if (!item)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.imageUrl?.startsWith("/uploads/catalog/")) {
    try {
      await fs.unlink(path.join(process.cwd(), "public", item.imageUrl));
    } catch {
      /* ignore */
    }
  }
  item.imageUrl = undefined;
  await persistCatalog();
  return NextResponse.json({ ok: true });
}
