import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function POST(req: Request) {
  let body: { lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const lang = body.lang;
  if (lang !== "en" && lang !== "zh") {
    return NextResponse.json({ error: "Invalid lang" }, { status: 400 });
  }
  const c = await cookies();
  c.set("pi_lang", lang, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return NextResponse.json({ ok: true });
}
