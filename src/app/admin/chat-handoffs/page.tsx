import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser, isInternal } from "@/lib/auth";
import { listHandoffs } from "@/lib/chat-handoffs";
import { ChatHandoffsClient } from "./ChatHandoffsClient";

export default async function ChatHandoffsPage() {
  const me = await getCurrentUser();
  if (!me || !isInternal(me)) redirect("/login?next=/admin/chat-handoffs");
  const handoffs = listHandoffs();
  return (
    <div className="space-y-4">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Admin home
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Chat handoffs
        </h1>
        <p className="text-sm text-slate-500">
          Customers who asked to talk to a human from the per-site chat.
        </p>
      </div>
      <ChatHandoffsClient initial={handoffs} />
    </div>
  );
}
