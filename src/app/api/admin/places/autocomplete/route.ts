import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const ENDPOINT = "https://places.googleapis.com/v1/places:autocomplete";
const TIMEOUT_MS = 8000;

interface PlaceSuggestion {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key)
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY not configured. Paste a key into .env.local and restart." },
      { status: 500 },
    );

  const body = (await req.json().catch(() => ({}))) as {
    input?: string;
    sessionToken?: string;
  };
  const input = (body.input ?? "").trim();
  if (!input || input.length < 3)
    return NextResponse.json({ predictions: [] });

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
      },
      body: JSON.stringify({
        input,
        sessionToken: body.sessionToken,
        includedRegionCodes: ["au"],
        languageCode: "en-AU",
      }),
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json(
        { error: `Google Places HTTP ${r.status}`, detail: text.slice(0, 300) },
        { status: 502 },
      );
    }
    const j = (await r.json()) as { suggestions?: PlaceSuggestion[] };
    const predictions = (j.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({
        placeId: p.placeId ?? "",
        description: p.text?.text ?? "",
        mainText: p.structuredFormat?.mainText?.text ?? "",
        secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
      }))
      .filter((p) => p.description);
    return NextResponse.json({ predictions });
  } catch (e) {
    return NextResponse.json(
      { error: "Places lookup failed", detail: String(e) },
      { status: 502 },
    );
  } finally {
    clearTimeout(t);
  }
}
