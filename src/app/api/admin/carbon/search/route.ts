import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchCarbonServices } from "@/lib/carbon-bridge";

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const address = url.searchParams.get("address") || undefined;
  const tag = url.searchParams.get("tag") || undefined;
  const serviceType = url.searchParams.get("service_type") || "nbn";
  if (!address && !tag) {
    return NextResponse.json(
      { error: "Either address or tag query param required" },
      { status: 400 },
    );
  }
  try {
    const result = await searchCarbonServices({
      address,
      tag,
      serviceType,
      perPage: 25,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: "Carbon search failed", detail: String(e) },
      { status: 502 },
    );
  }
}
