import { NextResponse } from "next/server";
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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const a = helpArticles.find((x) => x.id === id);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Partial<HelpArticle>;
  if (typeof b.title === "string") a.title = b.title.trim();
  if (
    typeof b.category === "string" &&
    VALID_CATEGORY.includes(b.category as HelpArticle["category"])
  )
    a.category = b.category as HelpArticle["category"];
  if (typeof b.estimatedMinutes === "number")
    a.estimatedMinutes = Math.max(0, b.estimatedMinutes);
  if (typeof b.appliesTo === "string") a.appliesTo = b.appliesTo.trim();
  if (
    typeof b.format === "string" &&
    VALID_FORMAT.includes(b.format as HelpArticle["format"])
  )
    a.format = b.format as HelpArticle["format"];
  if (typeof b.bodyMarkdown === "string") {
    const v = b.bodyMarkdown;
    a.bodyMarkdown = v || undefined;
  }
  if (typeof b.videoUrl === "string") {
    const v = b.videoUrl.trim();
    a.videoUrl = v || undefined;
  }
  await persistHelpArticles();
  return NextResponse.json({ ok: true, article: a });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const i = helpArticles.findIndex((x) => x.id === id);
  if (i === -1)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  helpArticles.splice(i, 1);
  await persistHelpArticles();
  return NextResponse.json({ ok: true });
}
