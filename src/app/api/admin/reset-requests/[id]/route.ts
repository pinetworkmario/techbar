import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listResetRequests, saveResetRequests } from "@/lib/store";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const requests = await listResetRequests();
  await saveResetRequests(requests.filter((r) => r.id !== id));
  return NextResponse.json({ ok: true });
}
