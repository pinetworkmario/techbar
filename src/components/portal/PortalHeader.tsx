import { ChevronDown, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { unreadCount } from "@/lib/notifications";
import { NotificationBell } from "./NotificationBell";

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("") || "?"
  );
}

export async function PortalHeader() {
  const me = await getCurrentUser();
  const display = me?.name || me?.email || "Signed in";
  const role = me?.role || (me?.isAdmin ? "PI Network Admin" : "");
  const initialUnread = me ? unreadCount(me.id) : 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative hidden flex-1 max-w-md md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search sites, devices, tickets..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell initialUnread={initialUnread} />
        <div className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {me ? initials(me.name) : "?"}
          </div>
          <div className="hidden text-left text-xs sm:block">
            <div className="font-medium text-slate-900">{display}</div>
            {role ? <div className="text-slate-500">{role}</div> : null}
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>
      </div>
    </header>
  );
}
