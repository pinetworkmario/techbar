import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { helpArticles } from "@/lib/data";
import { HelpArticlesClient } from "./HelpArticlesClient";

export default async function HelpArticlesPage() {
  const me = await getCurrentUser();
  if (!me?.isAdmin) redirect("/login?next=/admin/help-articles");
  return (
    <div className="space-y-4">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Admin home
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Help Articles</h1>
        <p className="text-sm text-slate-500">
          Knowledge-base content shown on <code>/portal/help</code>. Markdown
          body is rendered as plain text for now (raw markdown will display).
        </p>
      </div>
      <HelpArticlesClient initial={helpArticles.slice()} />
    </div>
  );
}
