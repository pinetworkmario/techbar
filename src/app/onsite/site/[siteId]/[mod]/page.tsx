import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { canAccessSite, getCurrentUser } from "@/lib/auth";
import {
  assetNumber,
  devicePhotoUrl,
  getDevicesForSite,
  getSiteById,
  getTicketsForSite,
} from "@/lib/data";
import "@/lib/server-data";
import type { Device, DeviceType } from "@/lib/types";
import { OnsiteModuleClient } from "./OnsiteModuleClient";
import { SiteChat } from "@/components/portal/SiteChat";

const MODULE_META: Record<
  string,
  { label: string; sub: string; category: string; tone: string }
> = {
  network: {
    label: "Network",
    sub: "Wi-Fi · Internet",
    category: "Network / Internet",
    tone: "from-sky-500/30 to-cyan-500/10",
  },
  voice: {
    label: "Voice",
    sub: "Phones · Extensions",
    category: "Voice / Phone",
    tone: "from-emerald-500/30 to-teal-500/10",
  },
  security: {
    label: "Security & Alarm",
    sub: "CCTV · Sensors",
    category: "CCTV / Alarm",
    tone: "from-violet-500/30 to-fuchsia-500/10",
  },
  pos: {
    label: "POS",
    sub: "Registers · Tickets",
    category: "POS Terminal",
    tone: "from-amber-500/30 to-orange-500/10",
  },
  eftpos: {
    label: "EFTPOS",
    sub: "Payment terminals",
    category: "Payment Terminal",
    tone: "from-rose-500/30 to-pink-500/10",
  },
  others: {
    label: "Others",
    sub: "Anything else",
    category: "Other / Not sure",
    tone: "from-slate-500/30 to-slate-400/10",
  },
};

/** Onsite category → which DeviceType values fall under it. */
const TYPES_BY_MODULE: Record<string, DeviceType[]> = {
  network: ["Router", "Switch", "Wi-Fi AP"],
  voice: ["Phone Handset"],
  security: ["NVR", "CCTV Camera", "Alarm Panel"],
  pos: ["POS Terminal", "Receipt Printer", "KDS", "CDS", "Android POS Device"],
  eftpos: ["Payment Terminal"],
  others: [],
};
const ALL_KNOWN: DeviceType[] = [
  ...TYPES_BY_MODULE.network,
  ...TYPES_BY_MODULE.voice,
  ...TYPES_BY_MODULE.security,
  ...TYPES_BY_MODULE.pos,
  ...TYPES_BY_MODULE.eftpos,
];

function filterDevices(mod: string, devices: Device[]): Device[] {
  const want = TYPES_BY_MODULE[mod];
  if (!want) return [];
  if (mod === "others") {
    return devices.filter((d) => !ALL_KNOWN.includes(d.type));
  }
  return devices.filter((d) => want.includes(d.type));
}

function deviceOrServiceMatches(mod: string, value: string): boolean {
  const v = value.toLowerCase();
  switch (mod) {
    case "network":
      return /network|internet|wifi|wi-fi|router|switch|\bap\b/.test(v);
    case "voice":
      return /voice|phone|extension|sip|pbx|handset/.test(v);
    case "security":
      return /cctv|camera|alarm|nvr|security|sensor/.test(v);
    case "pos":
      return /\bpos\b|register|kds|cds|receipt|printer|sunmi/.test(v);
    case "eftpos":
      return /eftpos|payment|tyro|terminal/.test(v);
    default:
      return false;
  }
}

export default async function OnsiteModulePage({
  params,
}: {
  params: Promise<{ siteId: string; mod: string }>;
}) {
  const { siteId, mod } = await params;
  const meta = MODULE_META[mod];
  if (!meta) notFound();
  const me = await getCurrentUser();
  if (!me) redirect("/onsite");
  const site = getSiteById(siteId);
  if (!site) notFound();
  if (!canAccessSite(me, site.id)) redirect("/onsite/site");

  const siteDevices = getDevicesForSite(siteId);
  const moduleDevices = filterDevices(mod, siteDevices);

  const allOpen = getTicketsForSite(siteId).filter(
    (t) => t.status !== "Resolved" && t.status !== "Closed",
  );
  const myTickets =
    mod === "others"
      ? allOpen.filter(
          (t) =>
            !["network", "voice", "security", "pos", "eftpos"].some((k) =>
              deviceOrServiceMatches(k, t.deviceOrService + " " + t.issueType),
            ),
        )
      : allOpen.filter((t) =>
          deviceOrServiceMatches(mod, t.deviceOrService + " " + t.issueType),
        );

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div
        className={
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-40 " +
          meta.tone
        }
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
        <Link
          href={`/onsite/site/${siteId}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 px-3 py-1.5 text-xs hover:bg-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            {site.name}
          </div>
          <div className="text-sm font-semibold">{meta.label}</div>
        </div>
      </header>
      <main className="relative mx-auto max-w-2xl px-4 py-6 pb-32 sm:px-8 sm:py-10">
        <h1 className="text-3xl font-bold tracking-tight">{meta.label}</h1>
        <p className="mt-1 text-sm text-slate-400">{meta.sub}</p>

        <OnsiteModuleClient
          siteId={siteId}
          siteName={site.name}
          mod={mod}
          modLabel={meta.label}
          ticketCategory={meta.category}
          devices={moduleDevices.map((d) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            location: d.location,
            status: d.status,
            asset: assetNumber(d),
            photoUrl: devicePhotoUrl(d),
          }))}
          openTickets={myTickets.map((t) => ({
            id: t.id,
            number: t.number,
            status: t.status,
            issueType: t.issueType,
            createdAt: t.createdAt,
            latestUpdate: t.latestUpdate,
          }))}
        />
      </main>

      {/* AI + human chat — fixed bottom-right on every onsite screen */}
      <SiteChat siteId={siteId} siteName={`${site.name} · ${meta.label}`} />
    </div>
  );
}
