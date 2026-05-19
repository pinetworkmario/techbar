import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  KeyRound,
  Wifi,
  Phone,
  Camera,
  ShoppingCart,
  Monitor,
  Activity,
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
import type { Site, SiteHealth } from "@/lib/types";

const HEALTH_TONE: Record<SiteHealth, string> = {
  Healthy: "bg-emerald-500 text-white",
  Warning: "bg-amber-500 text-white",
  Critical: "bg-rose-500 text-white",
};

function LinkBlock({ links }: { links: VendorLink[] }) {
  if (links.length === 0) {
    return (
      <p className="text-xs text-slate-400">No vendor portals configured.</p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a
          key={l.url + l.label}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
        >
          <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-sky-500" />
          <span>{l.label}</span>
          {l.hint ? (
            <span className="text-slate-400 group-hover:text-sky-600">
              · {l.hint}
            </span>
          ) : null}
          {l.needsCreds ? (
            <KeyRound className="h-3 w-3 text-amber-500" />
          ) : null}
        </a>
      ))}
    </div>
  );
}

function ModuleCard({
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={
              "grid h-9 w-9 place-items-center rounded-full " +
              (ok ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-400")
            }
          >
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
        <span
          className={
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
            (ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400")
          }
        >
          {ok ? "configured" : "not set"}
        </span>
      </div>
      {facts.length > 0 ? (
        <dl className="mt-3 space-y-1 text-xs">
          {facts.map((f) => (
            <div key={f.label} className="flex justify-between gap-3">
              <dt className="text-slate-500">{f.label}</dt>
              <dd className="truncate font-medium text-slate-800">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="mt-3">
        <LinkBlock links={links} />
      </div>
    </div>
  );
}

function networkFacts(site: Site) {
  const m = site.networkModule;
  if (!m) return [];
  const facts: { label: string; value: string }[] = [
    { label: "Vendor", value: m.vendor },
    { label: "Site identifier", value: m.siteIdentifier || "—" },
  ];
  if (site.lanSubnet) facts.push({ label: "LAN /24", value: site.lanSubnet });
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
    { label: "Mode", value: m.mode === "default_pbx" ? "Default PBX" : "Custom domain" },
  ];
  if (m.customDomain) facts.push({ label: "Domain", value: m.customDomain });
  if (m.extensions?.length)
    facts.push({ label: "Extensions", value: m.extensions.join(", ") });
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
  if (m.cameraPasswordSet) facts.push({ label: "Camera password", value: "✓ in vault" });
  if (m.alarmPasswordSet) facts.push({ label: "Alarm password", value: "✓ in vault" });
  return facts;
}

function posFacts(site: Site) {
  const m = site.posModule;
  if (!m) return [];
  const facts: { label: string; value: string }[] = [];
  if (m.vendor) facts.push({ label: "Vendor", value: m.vendor });
  if (m.managed) facts.push({ label: "Managed", value: "Yes" });
  if (m.sunmiSiteName) facts.push({ label: "Sunmi site", value: m.sunmiSiteName });
  if (m.terminalIp) facts.push({ label: "Terminal IP", value: m.terminalIp });
  return facts;
}

function endpointFacts(site: Site) {
  const m = site.endpointModule;
  if (!m) return [];
  if (m.ateraCustomerName)
    return [{ label: "Atera customer", value: m.ateraCustomerName }];
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

  return (
    <div className="space-y-6">
      <Link
        href="/tech/sites"
        className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> All sites
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-semibold text-slate-900">
              {site.name}
            </h1>
            <span
              className={
                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                HEALTH_TONE[site.health]
              }
            >
              {site.health}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {site.state} · {site.address}
          </p>
          {site.outageReport ? (
            <p
              className={
                "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs " +
                (site.outageReport.status === "operational"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700")
              }
            >
              <Activity className="h-3 w-3" /> {site.outageReport.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={vaultwardenSearchUrl(site.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
          >
            <KeyRound className="h-3.5 w-3.5" /> Open in Vaultwarden
          </a>
          <Link
            href={`/admin/sites/${site.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit profile →
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ModuleCard
          title="Network"
          icon={Wifi}
          status={site.networkModule ? "configured" : "missing"}
          facts={networkFacts(site)}
          links={networkLinks(site)}
        />
        <ModuleCard
          title="Voice"
          icon={Phone}
          status={site.voiceModule ? "configured" : "missing"}
          facts={voiceFacts(site)}
          links={voiceLinks(site)}
        />
        <ModuleCard
          title="CCTV & Alarm"
          icon={Camera}
          status={site.cctvModule ? "configured" : "missing"}
          facts={cctvFacts(site)}
          links={cctvLinks(site)}
        />
        <ModuleCard
          title="POS"
          icon={ShoppingCart}
          status={site.posModule ? "configured" : "missing"}
          facts={posFacts(site)}
          links={posLinks(site)}
        />
        <ModuleCard
          title="Endpoint / RMM"
          icon={Monitor}
          status={site.endpointModule ? "configured" : "missing"}
          facts={endpointFacts(site)}
          links={endpointLinks(site)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h3 className="text-sm font-semibold text-slate-900">
            Devices ({devices.length})
          </h3>
          {devices.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No devices recorded.</p>
          ) : (
            <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-xs">
              {devices.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-slate-50"
                >
                  <span className="truncate text-slate-700">
                    {d.name}
                    <span className="text-slate-400"> · {d.type}</span>
                  </span>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                      (d.status === "Active"
                        ? "bg-emerald-50 text-emerald-700"
                        : d.status === "Offline"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-500")
                    }
                  >
                    {d.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h3 className="text-sm font-semibold text-slate-900">
            Open tickets ({openTickets.length})
          </h3>
          {openTickets.length === 0 ? (
            <p className="mt-2 text-xs text-emerald-600">All clear.</p>
          ) : (
            <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-xs">
              {openTickets.map((t) => (
                <li
                  key={t.id}
                  className="rounded-md px-2 py-1 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate font-medium text-slate-800">
                      {t.number} · {t.issueType}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">
                      {t.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {t.deviceOrService} · {t.businessImpact}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
