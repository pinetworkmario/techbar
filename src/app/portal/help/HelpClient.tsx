"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Clock,
  ExternalLink,
  PlayCircle,
  Search,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import type { HelpArticle } from "@/lib/types";

const CATEGORIES: ("All" | HelpArticle["category"])[] = [
  "All",
  "Network",
  "POS & Payments",
  "CCTV & Alarm",
  "Voice",
  "IT Support",
  "Portal Guide",
];

export function HelpClient({ articles }: { articles: HelpArticle[] }) {
  const [cat, setCat] = useState<"All" | HelpArticle["category"]>("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<HelpArticle | null>(null);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (cat !== "All" && a.category !== cat) return false;
      if (q.trim()) {
        const term = q.toLowerCase();
        if (
          !a.title.toLowerCase().includes(term) &&
          !(a.bodyMarkdown ?? "").toLowerCase().includes(term)
        )
          return false;
      }
      return true;
    });
  }, [articles, cat, q]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & Training"
        description="Quick answers to common in-store technology questions."
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => {
              const active = cat === c;
              return (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={
                    "rounded-lg px-3 py-1.5 text-sm transition " +
                    (active
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100")
                  }
                >
                  {c}
                </button>
              );
            })}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search articles…"
              className="w-full rounded-md border border-slate-200 py-2 pl-8 pr-3 text-sm"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No articles match.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((a) => {
              const Icon = a.format === "Video" ? PlayCircle : BookOpen;
              const tone =
                a.format === "Video" ? "text-rose-500" : "text-brand-600";
              const hasBody = !!a.bodyMarkdown;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (a.format === "Video" && a.videoUrl) {
                        window.open(a.videoUrl, "_blank");
                      } else if (hasBody) {
                        setOpen(a);
                      }
                    }}
                    disabled={!hasBody && !a.videoUrl}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-slate-50 disabled:cursor-default disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={"h-5 w-5 " + tone} />
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {a.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                          <Badge>{a.category}</Badge>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {a.estimatedMinutes} min
                          </span>
                          <span>· Applies to {a.appliesTo}</span>
                        </div>
                      </div>
                    </div>
                    {a.format === "Video" && a.videoUrl ? (
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {open ? (
        <ArticleModal article={open} onClose={() => setOpen(null)} />
      ) : null}
    </div>
  );
}

function ArticleModal({
  article,
  onClose,
}: {
  article: HelpArticle;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {article.title}
            </h2>
            <p className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
              <Badge>{article.category}</Badge>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {article.estimatedMinutes} min
              </span>
              <span>· {article.appliesTo}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="prose prose-slate max-w-none overflow-y-auto px-5 py-4 text-sm">
          <ReactMarkdown>
            {article.bodyMarkdown || "(no content)"}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
