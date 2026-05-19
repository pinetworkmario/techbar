import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listResetRequests } from "@/lib/store";

export async function GET() {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const requests = await listResetRequests();
  // Newest first
  requests.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  return NextResponse.json({ requests });
}
