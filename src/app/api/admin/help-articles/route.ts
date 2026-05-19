import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { helpArticles } from "@/lib/data";
import { persistHelpArticles } from "@/lib/server-data";
import type { HelpArticle } from "@/lib/types";

const VALID_CATEGORY: HelpArticle["category"][] = [
  "Network",
  "POS & Payments",
  "CCTV & Alarm",
  "Voice",
  "IT Support",
  "Portal Guide",
];
const VALID_FORMAT: HelpArticle["format"][] = ["Article", "Video"];

export async function GET() {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ articles: helpArticles.slice() });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Partial<HelpArticle>;
  const title = (b.title ?? "").trim();
  if (!title)
    return NextResponse.json({ error: "title required" }, { status: 400 });
  const category = VALID_CATEGORY.includes(
    b.category as HelpArticle["category"],
  )
    ? (b.category as HelpArticle["category"])
    : "Portal Guide";
  const format = VALID_FORMAT.includes(b.format as HelpArticle["format"])
    ? (b.format as HelpArticle["format"])
    : "Article";

  const article: HelpArticle = {
    id: `h-${randomBytes(4).toString("hex")}`,
    title,
    category,
    estimatedMinutes: Math.max(0, Number(b.estimatedMinutes) || 5),
    appliesTo: (b.appliesTo ?? "").trim() || category,
    format,
    bodyMarkdown: typeof b.bodyMarkdown === "string" ? b.bodyMarkdown : undefined,
    videoUrl: typeof b.videoUrl === "string" ? b.videoUrl.trim() || undefined : undefined,
  };
  helpArticles.unshift(article);
  await persistHelpArticles();
  return NextResponse.json({ ok: true, article });
}
