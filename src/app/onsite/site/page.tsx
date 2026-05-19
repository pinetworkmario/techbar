import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, LogOut } from "lucide-react";
import { allowedSiteIds, getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import "@/lib/server-data";

export default async function OnsiteSitePicker() {
  const me = await getCurrentUser();
  if (!me) redirect("/onsite");
  const allowed = sites.filter((s) =>
    allowedSiteIds(me, sites.map((x) => x.id)).includes(s.id),
  );
  if (allowed.length === 0)
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-300">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-100">No sites yet</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your account has no accessible sites. Ask PI Network to add you, or
            use the standard portal to create one.
          </p>
          <Link
            href="/onsite"
            className="mt-6 inline-block rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900"
          >
            ← Back
          </Link>
        </div>
      </div>
    );
  if (allowed.length === 1) redirect(`/onsite/site/${allowed[0].id}`);
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(56,189,248,0.25), transparent 40%), radial-gradient(circle at 80% 90%, rgba(168,85,247,0.18), transparent 50%)",
        }}
      />
      <header className="relative flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="text-sm uppercase tracking-[0.4em] text-sky-400">
          PI Network · Onsite
        </div>
        <Link
          href="/api/auth/logout"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
        >
          <LogOut className="h-3.5 w-3.5" /> Lock
        </Link>
      </header>
      <main className="relative mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold">Pick your site</h1>
        <p className="mt-1 text-sm text-slate-400">
          Hi {me.name}. You have access to {allowed.length} sites.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {allowed.map((s) => (
            <li key={s.id}>
              <Link
                href={`/onsite/site/${s.id}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-sky-500/50 hover:bg-slate-800/60 hover:shadow-[0_0_24px_rgba(56,189,248,0.15)]"
              >
                <div className="rounded-xl bg-sky-500/15 p-2 text-sky-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="text-xs text-slate-400">
                    {s.state} · {s.address}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
