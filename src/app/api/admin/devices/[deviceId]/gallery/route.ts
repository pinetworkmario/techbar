import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getCurrentUser, isInternal } from "@/lib/auth";
import { devices } from "@/lib/data";
import { getDeviceOverrides, saveDeviceOverrides } from "@/lib/store";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_GALLERY = 8;
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function devicePath(): string {
  return path.join(process.cwd(), "public", "uploads", "devices");
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ deviceId: string }> },
) {
  const me = await getCurrentUser();
  if (!me || !isInternal(me))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { deviceId } = await ctx.params;
  const safeId = deviceId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const device = devices.find((d) => d.id === deviceId);
  if (!device)
    return NextResponse.json({ error: "Device not found" }, { status: 404 });

  const overrides = await getDeviceOverrides();
  const cur = overrides[deviceId] ?? {};
  const gallery = cur.gallery ?? [];
  if (gallery.length >= MAX_GALLERY) {
    return NextResponse.json(
      { error: `Gallery limit reached (${MAX_GALLERY}). Remove a photo first.` },
      { status: 400 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  const ext = EXT_BY_MIME[file.type];
  if (!ext)
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP or GIF" },
      { status: 400 },
    );

  const filename = `${safeId}-gallery-${Date.now()}.${ext}`;
  const dir = devicePath();
  await fs.mkdir(dir, { recursive: true });
  const fp = path.join(dir, filename);
  await fs.writeFile(fp, Buffer.from(await file.arrayBuffer()));

  const url = `/uploads/devices/${filename}`;
  overrides[deviceId] = { ...cur, gallery: [...gallery, url] };
  await saveDeviceOverrides(overrides);
  return NextResponse.json({ ok: true, url, gallery: overrides[deviceId].gallery });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ deviceId: string }> },
) {
  const me = await getCurrentUser();
  if (!me || !isInternal(me))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { deviceId } = await ctx.params;
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !url.startsWith("/uploads/devices/"))
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });

  const overrides = await getDeviceOverrides();
  const cur = overrides[deviceId];
  if (!cur || !cur.gallery?.includes(url))
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  cur.gallery = cur.gallery.filter((u) => u !== url);
  if (cur.gallery.length === 0) delete cur.gallery;
  overrides[deviceId] = cur;
  await saveDeviceOverrides(overrides);

  // Best-effort filesystem cleanup
  try {
    await fs.unlink(path.join(process.cwd(), "public", url));
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true, gallery: cur.gallery ?? [] });
}
