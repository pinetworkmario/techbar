import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listHandoffs } from "@/lib/chat-handoffs";
import { ChatHandoffsClient } from "@/app/admin/chat-handoffs/ChatHandoffsClient";

export default async function TechHandoffsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/tech/handoffs");
  if (!me.isAdmin && !me.isTech) redirect("/portal/sites");
  const handoffs = listHandoffs();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Chat handoffs
        </h1>
        <p className="text-sm text-slate-500">
          Customers who asked to talk to a human from the per-site chat.
          Claim one to take over and reply via Slack.
        </p>
      </div>
      <ChatHandoffsClient initial={handoffs} />
    </div>
  );
}
