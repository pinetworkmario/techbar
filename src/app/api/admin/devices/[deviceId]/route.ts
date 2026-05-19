import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDeviceOverrides, saveDeviceOverrides } from "@/lib/store";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ deviceId: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { deviceId } = await ctx.params;
  const body = await req.json();
  const overrides = await getDeviceOverrides();
  const next = { ...(overrides[deviceId] || {}) };
  if (typeof body.assetNumber === "string") {
    const v = body.assetNumber.trim();
    if (v) next.assetNumber = v;
    else delete next.assetNumber;
  }
  if (typeof body.notes === "string") {
    const v = body.notes.trim();
    if (v) next.notes = v;
    else delete next.notes;
  }
  overrides[deviceId] = next;
  await saveDeviceOverrides(overrides);
  return NextResponse.json({ ok: true, override: next });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ deviceId: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { deviceId } = await ctx.params;
  const overrides = await getDeviceOverrides();
  delete overrides[deviceId];
  await saveDeviceOverrides(overrides);
  return NextResponse.json({ ok: true });
}
