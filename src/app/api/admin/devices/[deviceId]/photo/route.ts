import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { devices } from "@/lib/data";
import { persistDevices } from "@/lib/server-data";

const MAX_BYTES = 5 * 1024 * 1024;
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ deviceId: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { deviceId } = await ctx.params;
  const safeId = deviceId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const device = devices.find((d) => d.id === deviceId);
  if (!device)
    return NextResponse.json({ error: "Device not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 5 MB)" },
      { status: 400 },
    );
  }
  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP or GIF" },
      { status: 400 },
    );
  }
  const filename = `${safeId}-${Date.now()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "devices");
  await fs.mkdir(dir, { recursive: true });
  const fp = path.join(dir, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(fp, buf);

  // Delete the previous photo if it was an uploaded one
  if (device.photoUrl?.startsWith("/uploads/devices/")) {
    try {
      await fs.unlink(path.join(process.cwd(), "public", device.photoUrl));
    } catch {
      /* ignore */
    }
  }
  device.photoUrl = `/uploads/devices/${filename}`;
  await persistDevices();
  return NextResponse.json({ ok: true, url: device.photoUrl });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ deviceId: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { deviceId } = await ctx.params;
  const device = devices.find((d) => d.id === deviceId);
  if (!device)
    return NextResponse.json({ error: "Device not found" }, { status: 404 });

  if (device.photoUrl?.startsWith("/uploads/devices/")) {
    try {
      await fs.unlink(path.join(process.cwd(), "public", device.photoUrl));
    } catch {
      /* ignore */
    }
  }
  device.photoUrl = undefined;
  await persistDevices();
  return NextResponse.json({ ok: true });
}
