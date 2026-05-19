import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { helpArticles } from "@/lib/data";
import "@/lib/server-data";

/** Customer-facing read-only help articles. Optional ?category=... filter. */
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cat = new URL(req.url).searchParams.get("category");
  let articles = helpArticles.slice();
  if (cat) articles = articles.filter((a) => a.category === cat);
  return NextResponse.json({ articles });
}
