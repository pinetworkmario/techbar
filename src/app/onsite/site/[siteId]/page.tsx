import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Camera,
  CreditCard,
  HelpCircle,
  LogOut,
  Phone,
  ShoppingCart,
  Wifi,
  Building2,
} from "lucide-react";
import { canAccessSite, getCurrentUser } from "@/lib/auth";
import { getSiteById, getTicketsForSite } from "@/lib/data";
import "@/lib/server-data";
import { SiteChat } from "@/components/portal/SiteChat";

interface SatelliteDef {
  key: string;
  label: string;
  sub: string;
  icon: typeof Wifi;
  accentBg: string;
  accentBorder: string;
  glow: string;
  /** Pentagon angle from top, in degrees (0 = top, clockwise). */
  angle: number;
}

const CENTER = {
  key: "eftpos",
  label: "EFTPOS",
  sub: "Payment terminals",
  icon: CreditCard,
};

// 5 satellites at 72° intervals, starting at top.
const SATELLITES: SatelliteDef[] = [
  {
    key: "network",
    label: "Network",
    sub: "Wi-Fi · Internet",
    icon: Wifi,
    accentBg: "from-sky-500/30 to-cyan-500/10",
    accentBorder: "border-sky-400/40",
    glow: "shadow-[0_0_40px_rgba(56,189,248,0.25)]",
    angle: 0,
  },
  {
    key: "pos",
    label: "POS",
    sub: "Registers · Tickets",
    icon: ShoppingCart,
    accentBg: "from-amber-500/30 to-orange-500/10",
    accentBorder: "border-amber-400/40",
    glow: "shadow-[0_0_40px_rgba(245,158,11,0.25)]",
    angle: 72,
  },
  {
    key: "voice",
    label: "Voice",
    sub: "Phones · Extensions",
    icon: Phone,
    accentBg: "from-emerald-500/30 to-teal-500/10",
    accentBorder: "border-emerald-400/40",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.25)]",
    angle: 144,
  },
  {
    key: "security",
    label: "Security & Alarm",
    sub: "CCTV · Sensors",
    icon: Camera,
    accentBg: "from-violet-500/30 to-fuchsia-500/10",
    accentBorder: "border-violet-400/40",
    glow: "shadow-[0_0_40px_rgba(168,85,247,0.25)]",
    angle: 216,
  },
  {
    key: "others",
    label: "Others",
    sub: "Anything else",
    icon: HelpCircle,
    accentBg: "from-slate-500/30 to-slate-400/10",
    accentBorder: "border-slate-400/40",
    glow: "shadow-[0_0_40px_rgba(148,163,184,0.25)]",
    angle: 288,
  },
];

export default async function OnsiteHome({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/onsite");
  const site = getSiteById(siteId);
  if (!site) notFound();
  if (!canAccessSite(me, site.id)) redirect("/onsite/site");
  const openTickets = getTicketsForSite(siteId).filter(
    (t) => t.status !== "Resolved" && t.status !== "Closed",
  ).length;

  // Satellite geometry — unit vectors from centre.
  const points = SATELLITES.map((s) => {
    const rad = (s.angle * Math.PI) / 180;
    return { ...s, dx: Math.sin(rad), dy: -Math.cos(rad) };
  });

  const CenterIcon = CENTER.icon;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Background gradients + grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 10%, rgba(56,189,248,0.22), transparent 40%), radial-gradient(circle at 85% 90%, rgba(244,63,94,0.18), transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <header className="relative flex items-center justify-between border-b border-slate-800/70 px-6 py-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-sky-400">
            PI Network · Onsite
          </div>
          <div className="mt-0.5 inline-flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="font-semibold">{site.name}</span>
            <span className="text-slate-500">· {site.state}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              Open tickets
            </div>
            <div
              className={
                "text-lg font-semibold " +
                (openTickets > 0 ? "text-amber-300" : "text-emerald-400")
              }
            >
              {openTickets}
            </div>
          </div>
          <Link
            href="/api/auth/logout"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          >
            <LogOut className="h-3.5 w-3.5" /> Lock
          </Link>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-6 sm:px-8">
        <h1 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          What needs help?
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          Tap any bubble. EFTPOS is centre — it's what stops trade.
        </p>

        {/* Bubble constellation */}
        <div className="relative mt-6 aspect-square w-full max-w-[600px]">
          {/* SVG connectors + halo */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="-100 -100 200 200"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <radialGradient id="halo" cx="0" cy="0" r="60" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(244,63,94,0.18)" />
                <stop offset="100%" stopColor="rgba(244,63,94,0)" />
              </radialGradient>
            </defs>
            {/* Soft halo around centre */}
            <circle cx="0" cy="0" r="55" fill="url(#halo)" />
            {/* Outer ring */}
            <circle
              cx="0"
              cy="0"
              r="78"
              fill="none"
              stroke="rgba(148,163,184,0.18)"
              strokeWidth="0.4"
              strokeDasharray="1 4"
            />
            {/* Connectors centre → satellites */}
            {points.map((p) => (
              <line
                key={p.key}
                x1={p.dx * 20}
                y1={p.dy * 20}
                x2={p.dx * 70}
                y2={p.dy * 70}
                stroke="rgba(148,163,184,0.32)"
                strokeWidth="0.5"
                strokeDasharray="2 3"
              />
            ))}
          </svg>

          {/* Centre bubble — EFTPOS */}
          <Link
            href={`/onsite/site/${siteId}/${CENTER.key}`}
            className="group absolute left-1/2 top-1/2 flex h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-rose-400/40 bg-gradient-to-br from-rose-500/40 to-pink-500/20 text-center shadow-[0_0_60px_rgba(244,63,94,0.35)] backdrop-blur-sm transition active:scale-95 hover:shadow-[0_0_80px_rgba(244,63,94,0.55)]"
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/15" />
            <CenterIcon className="relative z-10 h-12 w-12 text-rose-50 transition group-hover:scale-110 sm:h-14 sm:w-14" />
            <div className="relative z-10 mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
              {CENTER.label}
            </div>
            <div className="relative z-10 mt-0.5 text-[10px] uppercase tracking-wider text-white/70">
              {CENTER.sub}
            </div>
            <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
          </Link>

          {/* Satellite bubbles */}
          {points.map((p) => {
            const Icon = p.icon;
            return (
              <Link
                key={p.key}
                href={`/onsite/site/${siteId}/${p.key}`}
                className={
                  "group absolute flex h-[24%] w-[24%] flex-col items-center justify-center rounded-full border bg-gradient-to-br text-center backdrop-blur-sm transition active:scale-95 hover:scale-[1.06] " +
                  p.accentBg +
                  " " +
                  p.accentBorder +
                  " " +
                  p.glow
                }
                style={{
                  left: `calc(50% + ${(p.dx * 38).toFixed(2)}%)`,
                  top: `calc(50% + ${(p.dy * 38).toFixed(2)}%)`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <Icon className="h-7 w-7 text-white transition group-hover:scale-110 sm:h-8 sm:w-8" />
                <div className="mt-1 px-1 text-xs font-bold leading-tight tracking-tight text-white sm:text-sm">
                  {p.label}
                </div>
                <div className="mt-0.5 text-[9px] uppercase tracking-wider text-white/60">
                  {p.sub}
                </div>
                <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
              </Link>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800/70 bg-slate-900/40 px-4 py-3 text-center text-xs text-slate-400">
          Need full controls?{" "}
          <Link href="/portal/sites" className="text-sky-400 hover:underline">
            Open the standard portal →
          </Link>
        </div>
      </main>

      {/* AI + human chat — fixed bottom-right on the constellation screen */}
      <SiteChat siteId={siteId} siteName={site.name} />
    </div>
  );
}
