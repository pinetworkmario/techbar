import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Camera,
  ExternalLink,
  Globe2,
  KeyRound,
  LineChart,
  Monitor,
  Phone,
  ShoppingCart,
  Wifi,
  Wrench,
  Radio,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getDevicesForSite,
  getSiteById,
  getTicketsForSite,
} from "@/lib/data";
import {
  cctvLinks,
  endpointLinks,
  networkLinks,
  posLinks,
  vaultwardenSearchUrl,
  voiceLinks,
  type VendorLink,
} from "@/lib/vendor-portals";
import type { Site, SiteHealth, DeviceStatus, TicketStatus } from "@/lib/types";
import { NbnCheckPanel } from "./NbnCheckPanel";

const HEALTH_BADGE: Record<SiteHealth, string> = {
  Healthy: "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40",
  Warning: "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40",
  Critical: "bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40",
};

const DEVICE_DOT: Record<DeviceStatus, string> = {
  Active: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]",
  Warning: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]",
  Offline: "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]",
  "In Support": "bg-cyan-400",
  "Not Monitored": "bg-slate-500",
};

const TICKET_PILL: Record<TicketStatus, string> = {
  New: "bg-cyan-500/20 text-cyan-200 ring-cyan-400/30",
  "In Progress": "bg-amber-500/20 text-amber-200 ring-amber-400/30",
  "Waiting for Customer": "bg-slate-700/60 text-slate-300 ring-slate-600/50",
  Scheduled: "bg-violet-500/20 text-violet-200 ring-violet-400/30",
  Resolved: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30",
  Closed: "bg-slate-700/60 text-slate-400 ring-slate-600/50",
};

function timeAgo(iso: string | undefined): string {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "—";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function VendorPortalCard({
  title,
  icon: Icon,
  status,
  facts,
  links,
}: {
  title: string;
  icon: typeof Wifi;
  status: "configured" | "missing";
  facts: { label: string; value: string }[];
  links: VendorLink[];
}) {
  const ok = status === "configured";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={
              "grid h-8 w-8 place-items-center rounded-lg " +
              (ok
                ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/30"
                : "bg-slate-800 text-slate-500")
            }
          >
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        </div>
        <span
          className={
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 " +
            (ok
              ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30"
              : "bg-slate-800/60 text-slate-500 ring-slate-700")
          }
        >
          {ok ? "online" : "n/a"}
        </span>
      </div>
      {facts.length > 0 ? (
        <dl className="mt-2 space-y-1 text-xs">
          {facts.map((f) => (
            <div key={f.label} className="flex justify-between gap-3">
              <dt className="text-slate-500">{f.label}</dt>
              <dd className="truncate font-mono font-medium text-slate-200">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {links.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {links.map((l) => (
            <a
              key={l.url + l.label}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-200"
            >
              <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-cyan-300" />
              <span>{l.label}</span>
              {l.needsCreds ? (
                <KeyRound className="h-3 w-3 text-amber-400" />
              ) : null}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function networkFacts(site: Site) {
  const m = site.networkModule;
  if (!m) return [];
  const facts: { label: string; value: string }[] = [
    { label: "Vendor", value: m.vendor },
    { label: "Site ID", value: m.siteIdentifier || "—" },
  ];
  if (site.lanSubnet) facts.push({ label: "LAN /24", value: `${site.lanSubnet}.0/24` });
  if (site.dhcpScope)
    facts.push({
      label: "DHCP",
      value: `${site.dhcpScope.startIp} – ${site.dhcpScope.endIp}`,
    });
  if (site.accessNetwork) {
    facts.push({
      label: "WAN",
      value: `${site.accessNetwork.type} · ${site.accessNetwork.carrier ?? ""}`.trim(),
    });
  }
  return facts;
}

function voiceFacts(site: Site) {
  const m = site.voiceModule;
  if (!m) return [];
  const facts = [
    {
      label: "Mode",
      value: m.mode === "default_pbx" ? "Default PBX" : "Custom domain",
    },
  ];
  if (m.customDomain) facts.push({ label: "Domain", value: m.customDomain });
  if (m.extensions?.length)
    facts.push({ label: "Ext", value: m.extensions.join(", ") });
  return facts;
}

function cctvFacts(site: Site) {
  const m = site.cctvModule;
  if (!m) return [];
  const facts: { label: string; value: string }[] = [];
  if (m.cameraVendor)
    facts.push({
      label: "Camera",
      value: `${m.cameraVendor}${m.cameraIp ? ` @ ${m.cameraIp}` : ""}`,
    });
  if (m.alarmVendor)
    facts.push({
      label: "Alarm",
      value: `${m.alarmVendor}${m.alarmIp ? ` @ ${m.alarmIp}` : ""}`,
    });
  if (m.cameraPasswordSet) facts.push({ label: "Cam pwd", value: "vault" });
  if (m.alarmPasswordSet) facts.push({ label: "Alarm pwd", value: "vault" });
  return facts;
}

function posFacts(site: Site) {
  const m = site.posModule;
  if (!m) return [];
  const facts: { label: string; value: string }[] = [];
  if (m.vendor) facts.push({ label: "Vendor", value: m.vendor });
  if (m.managed) facts.push({ label: "Managed", value: "Yes" });
  if (m.sunmiSiteName) facts.push({ label: "Sunmi", value: m.sunmiSiteName });
  if (m.terminalIp) facts.push({ label: "Terminal", value: m.terminalIp });
  return facts;
}

function endpointFacts(site: Site) {
  const m = site.endpointModule;
  if (!m) return [];
  if (m.ateraCustomerName)
    return [{ label: "Atera", value: m.ateraCustomerName }];
  return [];
}

export default async function TechSitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const me = await getCurrentUser();
  if (!me) redirect(`/login?next=/tech/sites/${siteId}`);
  if (!me.isAdmin && !me.isTech) redirect("/portal/sites");

  const site = getSiteById(siteId);
  if (!site) notFound();
  const devices = getDevicesForSite(siteId);
  const tickets = getTicketsForSite(siteId);
  const openTickets = tickets.filter(
    (t) => t.status !== "Resolved" && t.status !== "Closed",
  );
  const recentTickets = tickets
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 10);

  const wan = site.accessNetwork;
  const outage = site.outageReport;
  const isOutage = outage && outage.status !== "operational";

  return (
    <div className="space-y-5">
      <Link
        href="/tech/sites"
        className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200"
      >
        <ArrowLeft className="h-4 w-4" /> All sites
      </Link>

      {/* HERO band */}
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-800 p-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(15,161,138,0.18) 0%, rgba(8,47,73,0.6) 50%, rgba(15,23,42,0.9) 100%)",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-mono text-2xl font-semibold text-slate-100">
                {site.name}
              </h1>
              <span
                className={
                  "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                  HEALTH_BADGE[site.health]
                }
              >
                {site.health}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-300">
              <span className="font-mono text-slate-200">{site.state}</span>
              <span className="text-slate-600"> · </span>
              {site.address}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 font-mono text-[11px]">
              {site.lanSubnet ? (
                <span className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-slate-200">
                  LAN <span className="text-cyan-300">{site.lanSubnet}.0/24</span>
                </span>
              ) : null}
              {site.dhcpScope ? (
                <span className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-slate-200">
                  DHCP{" "}
                  <span className="text-cyan-300">
                    {site.dhcpScope.startIp}–{site.dhcpScope.endIp}
                  </span>
                </span>
              ) : null}
              {wan ? (
                <span className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-slate-200">
                  WAN{" "}
                  <span className="text-cyan-300">
                    {wan.type}
                    {wan.carrier ? ` · ${wan.carrier}` : ""}
                  </span>
                </span>
              ) : null}
              <span className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-slate-300">
                last seen{" "}
                <span className="text-slate-100">{timeAgo(site.updatedAt)}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/sites/${site.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400/40 hover:text-cyan-200"
            >
              <Wrench className="h-3.5 w-3.5" /> Open in admin
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* LEFT (2 cols) — live status panel */}
        <div className="space-y-4 lg:col-span-2">
          {/* Ping / latency */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Activity className="h-4 w-4 text-cyan-400" /> Live latency
              </h3>
              <span className="font-mono text-[11px] text-slate-500">
                not wired
              </span>
            </div>
            <div className="mt-3 flex items-end gap-4">
              <div>
                <div className="font-mono text-4xl font-semibold text-cyan-300">
                  —
                </div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  ms ping
                </div>
              </div>
              <div className="flex h-16 flex-1 items-end gap-0.5 rounded-md border border-slate-800 bg-slate-950/40 p-2">
                {Array.from({ length: 40 }).map((_, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-sm bg-slate-800"
                    style={{ height: `${10 + ((i * 7) % 70)}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* DNS + carrier outage cards */}
          <div className="grid gap-3 md:grid-cols-2">
            <div
              className={
                "rounded-2xl border bg-slate-900/60 p-4 " +
                (isOutage
                  ? "border-rose-500/40 shadow-glow-rose"
                  : "border-slate-800")
              }
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Radio className="h-4 w-4 text-rose-300" /> Carrier outage
              </h3>
              {outage ? (
                <>
                  <p
                    className={
                      "mt-2 font-mono text-xs uppercase tracking-wider " +
                      (outage.status === "operational"
                        ? "text-emerald-300"
                        : "text-rose-300")
                    }
                  >
                    {outage.status}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    {outage.message}
                  </p>
                  <p className="mt-2 font-mono text-[10px] text-slate-500">
                    checked {timeAgo(outage.checkedAt)} · {outage.source}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-slate-400">
                  No outage report yet.
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Globe2 className="h-4 w-4 text-cyan-300" /> NBN check
              </h3>
              <div className="mt-2">
                <NbnCheckPanel address={site.address} />
              </div>
            </div>
          </div>

          {/* Device list */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                Devices{" "}
                <span className="font-mono text-xs text-slate-500">
                  ({devices.length})
                </span>
              </h3>
            </div>
            {devices.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No devices recorded.</p>
            ) : (
              <ul className="mt-3 max-h-80 space-y-0.5 overflow-y-auto text-xs">
                {devices.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-slate-800/40"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={
                          "h-2 w-2 shrink-0 rounded-full " +
                          DEVICE_DOT[d.status]
                        }
                      />
                      <span className="truncate text-slate-200">
                        {d.name}{" "}
                        <span className="text-slate-500">· {d.type}</span>
                      </span>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      {d.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent ticket history */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                Recent tickets{" "}
                <span className="font-mono text-xs text-slate-500">
                  ({openTickets.length} open / {tickets.length} total)
                </span>
              </h3>
            </div>
            {recentTickets.length === 0 ? (
              <p className="mt-2 text-xs text-emerald-300">All clear.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-xs">
                {recentTickets.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-md border border-transparent px-2 py-1.5 hover:border-slate-700 hover:bg-slate-800/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-slate-100">
                        {t.number}
                      </span>
                      <span
                        className={
                          "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ring-1 " +
                          TICKET_PILL[t.status]
                        }
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-slate-300">
                      {t.issueType}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {t.deviceOrService} · {timeAgo(t.createdAt)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT — quick actions + vendor portals */}
        <aside className="space-y-3">
          <a
            href={vaultwardenSearchUrl(site.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/25 hover:shadow-glow-cyan"
          >
            <KeyRound className="h-4 w-4" /> Open in Vaultwarden
          </a>

          <VendorPortalCard
            title="Network"
            icon={Wifi}
            status={site.networkModule ? "configured" : "missing"}
            facts={networkFacts(site)}
            links={networkLinks(site)}
          />
          <VendorPortalCard
            title="CCTV & Alarm"
            icon={Camera}
            status={site.cctvModule ? "configured" : "missing"}
            facts={cctvFacts(site)}
            links={cctvLinks(site)}
          />
          <VendorPortalCard
            title="POS"
            icon={ShoppingCart}
            status={site.posModule ? "configured" : "missing"}
            facts={posFacts(site)}
            links={posLinks(site)}
          />
          <VendorPortalCard
            title="Endpoint / RMM"
            icon={Monitor}
            status={site.endpointModule ? "configured" : "missing"}
            facts={endpointFacts(site)}
            links={endpointLinks(site)}
          />
          <VendorPortalCard
            title="Voice"
            icon={Phone}
            status={site.voiceModule ? "configured" : "missing"}
            facts={voiceFacts(site)}
            links={voiceLinks(site)}
          />

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Diagnostics
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              <Link
                href={`/admin/sites/${site.id}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-200"
              >
                <LineChart className="h-3.5 w-3.5 text-cyan-300" /> Run pcap
                analysis
              </Link>
              <Link
                href={`/admin/sites/${site.id}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-200"
              >
                <Wrench className="h-3.5 w-3.5 text-cyan-300" /> Open in admin
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
