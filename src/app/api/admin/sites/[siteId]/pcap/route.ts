import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import { discoverDevices } from "@/lib/pcap-discover";

export const runtime = "nodejs";
export const maxDuration = 180; // seconds; tshark can be slow on big files

const MAX_BYTES = 120 * 1024 * 1024; // 120 MB
const ALLOWED_EXT = new Set([".pcap", ".pcapng", ".cap"]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ siteId: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { siteId } = await ctx.params;
  const site = sites.find((s) => s.id === siteId);
  if (!site)
    return NextResponse.json({ error: "Site not found" }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid multipart body", detail: String(e) },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Missing "file" field' },
      { status: 400 },
    );
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: `Unsupported file type "${ext}". Use .pcap / .pcapng / .cap` },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_BYTES / 1024 / 1024} MB.`,
      },
      { status: 413 },
    );
  }

  const tmp = path.join(
    os.tmpdir(),
    `pcap-${siteId}-${randomBytes(6).toString("hex")}${ext}`,
  );
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(tmp, buf);

  try {
    const result = await discoverDevices({
      filePath: tmp,
      siteName: site.name,
      lanSubnet: site.lanSubnet,
    });
    return NextResponse.json({
      ok: true,
      filename: file.name,
      bytes: file.size,
      ...result,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Pcap discovery failed", detail: String(e) },
      { status: 500 },
    );
  } finally {
    fs.unlink(tmp).catch(() => undefined);
  }
}
