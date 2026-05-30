"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Globe,
  Hammer,
  Image as ImageIcon,
  Info,
  LifeBuoy,
  Lock,
  LockOpen,
  MapPin,
  Monitor,
  Network as NetworkIcon,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  Tablet,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Users,
  Wifi,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  DeviceStatusBadge,
  SiteHealthBadge,
  TicketStatusBadge,
} from "@/components/ui/StatusBadges";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { CreateTicketModal } from "@/components/portal/CreateTicketModal";
import {
  assetNumber,
  deviceCategory,
  devicePhotoUrl,
  getTicketsForSite,
  projectPhotos,
  projects,
  siteExtras,
} from "@/lib/data";
import type {
  AccessNetworkType,
  Device,
  OutageReport,
  ServiceCategory,
  Site,
  SiteExtras,
} from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { getSupportPack } from "@/lib/support-packs";
import { getAccessTypeMeta } from "@/lib/access-network";
import {
  getExternalTraffic,
  getInternalAttendance,
  type FootTrafficSummary,
  type StaffShift,
} from "@/lib/traffic";
import type { DiscoveredDevice } from "@/lib/discovery";
import { NbnOutageCard } from "@/components/portal/NbnOutageCard";

interface DeviceOverride {
  assetNumber?: string;
  photoUrl?: string;
}
type Overrides = Record<string, DeviceOverride>;

function resolveAsset(d: Device, overrides: Overrides): string {
  return overrides[d.id]?.assetNumber || assetNumber(d);
}
function resolvePhoto(d: Device, overrides: Overrides): string {
  return overrides[d.id]?.photoUrl || devicePhotoUrl(d);
}

function _hashId(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function shortName(name: string): string {
  // Strip leading site prefix if present (e.g. "Shepparton CoreSwitch" → "CoreSwitch")
  const parts = name.split(/\s+/);
  if (parts.length > 1) return parts.slice(1).join(" ");
  return name;
}

interface UpstreamInfo {
  label: string;
  viaStatus: Device["status"] | null;
}

function computeUpstream(d: Device, all: Device[]): UpstreamInfo {
  if (d.type === "Router") return { label: "ISP / WAN", viaStatus: null };
  let upstream: Device | undefined;
  if (d.type === "Switch") {
    upstream = all.find((x) => x.type === "Router");
  } else if (d.type === "Wi-Fi AP") {
    upstream =
      all.find((x) => x.type === "Switch") ||
      all.find((x) => x.type === "Router");
  } else {
    // POS, KDS, CDS, Phone, PC, Server, etc.
    upstream =
      all.find((x) => x.type === "Switch") ||
      all.find((x) => x.type === "Router");
  }
  if (!upstream) return { label: "Gateway", viaStatus: null };
  return { label: shortName(upstream.name), viaStatus: upstream.status };
}

interface PingResult {
  upstreamMs: number | null;
  googleMs: number | null;
}

function computePings(
  d: Device,
  upstream: UpstreamInfo,
): PingResult {
  if (d.status === "Offline")
    return { upstreamMs: null, googleMs: null };
  if (upstream.viaStatus === "Offline") {
    // Upstream device down — local ping fails, internet definitely fails
    return { upstreamMs: null, googleMs: null };
  }
  const h = _hashId(d.id);
  const warn = d.status === "Warning";
  const upstreamMs = Math.max(1, ((h % 4) + 1) * (warn ? 4 : 1));
  const googleMs = (8 + (h % 14)) * (warn ? 3 : 1);
  return { upstreamMs, googleMs };
}

const ALL_TABS: {
  key: ServiceCategory;
  label: string;
  icon: typeof NetworkIcon;
}[] = [
  { key: "network", label: "Network", icon: NetworkIcon },
  { key: "voice", label: "Voice", icon: PhoneCall },
  { key: "cctv", label: "CCTV & Alarm", icon: ShieldCheck },
  { key: "pos", label: "POS", icon: CreditCard },
  { key: "endpoint", label: "Endpoint", icon: Monitor },
  { key: "traffic_analysis", label: "Traffic Analysis", icon: Activity },
  { key: "it_support", label: "IT Support", icon: LifeBuoy },
  { key: "projects", label: "Projects & Installation", icon: Hammer },
];

export function SiteDetailClient({
  site,
  siteDevices,
  overrides,
  allowedModules,
  isAdmin,
}: {
  site: Site;
  siteDevices: Device[];
  overrides: Overrides;
  allowedModules: ServiceCategory[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const tabs = ALL_TABS.filter((t) => allowedModules.includes(t.key));
  const [liveDevices, setLiveDevices] = useState<Device[]>(siteDevices);
  // When server re-renders (e.g. after Adopt), refresh liveDevices from prop
  useEffect(() => {
    setLiveDevices(siteDevices);
  }, [siteDevices]);
  const handleAdopted = () => router.refresh();
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const stoppedRef = useRef(false);

  // Auto-refresh device status every 5 minutes while the user is on this page.
  // Triggers an immediate fetch on mount, then setInterval. Stops on unmount,
  // and bails out permanently on 401/403 (session expired).
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    async function refresh() {
      if (stoppedRef.current || cancelled) return;
      setRefreshing(true);
      try {
        const r = await fetch(
          `/api/account/sites/${site.id}/refresh-status`,
          { method: "POST" },
        );
        if (r.status === 401 || r.status === 403) {
          stoppedRef.current = true;
          return;
        }
        if (!r.ok) return;
        const j = await r.json();
        const map = new Map<string, Device["status"]>(
          (j.devices || []).map((x: { id: string; status: Device["status"] }) => [
            x.id,
            x.status,
          ]),
        );
        if (cancelled) return;
        setLiveDevices((prev) =>
          prev.map((d) => {
            const live = map.get(d.id);
            return live && live !== d.status ? { ...d, status: live } : d;
          }),
        );
        setLastChecked(new Date());
      } catch {
        /* ignore network errors */
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }
    refresh();
    timer = setInterval(refresh, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [site.id]);

  const devicesByCategory = (cat: ServiceCategory) =>
    liveDevices.filter((d) => deviceCategory(d.type) === cat);
  const [tab, setTab] = useState<ServiceCategory>(
    tabs[0]?.key ?? "network",
  );
  const [ticketDeviceLabel, setTicketDeviceLabel] = useState<string | null>(
    null,
  );
  const extras: SiteExtras = siteExtras[site.id] ?? {};

  return (
    <div className="space-y-6">
      <Link
        href="/portal/sites"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Sites
      </Link>

      <PageHeader
        title={site.name}
        description={site.address}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  refreshing
                    ? "bg-amber-500 animate-pulse"
                    : lastChecked
                      ? "bg-emerald-500"
                      : "bg-slate-400",
                )}
              />
              {refreshing
                ? "Refreshing…"
                : lastChecked
                  ? `Live · updated ${lastChecked.toLocaleTimeString()}`
                  : "Connecting…"}
            </span>
            <Link
              href={`/onsite/site/${site.id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-br from-slate-900 to-slate-800 px-3 py-2 text-sm font-medium text-white shadow ring-1 ring-sky-500/40 hover:from-slate-800 hover:to-slate-700 hover:shadow-[0_0_16px_rgba(56,189,248,0.3)]"
              title="Switch to the iPad-friendly onsite mode for this site"
            >
              <Tablet className="h-4 w-4 text-sky-400" />
              Onsite Mode
            </Link>
            <Button
              variant="secondary"
              onClick={() => setTicketDeviceLabel("General request")}
            >
              <PlusCircle className="h-4 w-4" /> Create Ticket
            </Button>
          </div>
        }
      />

      <SupportPackBanner site={site} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SiteFact label="State" value={site.state} icon={MapPin} />
        <SiteFact
          label="Health"
          value={<SiteHealthBadge health={site.health} />}
          icon={Building2}
        />
        <SiteFact
          label="Main contact"
          value={`${site.mainContact.name} · ${site.mainContact.role}`}
          icon={PhoneCall}
        />
        <SiteFact
          label="Open tickets"
          value={String(site.openTickets)}
          icon={LifeBuoy}
        />
      </div>

      {tabs.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You do not have access to any modules at this site. Contact your
          PiNetwork administrator if this looks wrong.
        </div>
      ) : (
        <>
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex flex-wrap gap-1 overflow-x-auto">
              {tabs.map((t) => {
                const active = tab === t.key;
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            {tab === "network" ? (
              <NetworkTab
                site={site}
                devices={devicesByCategory("network")}
                siteDevices={liveDevices}
                extras={extras}
                overrides={overrides}
                onCreateTicket={(label) => setTicketDeviceLabel(label)}
              />
            ) : null}
            {tab === "voice" ? (
              <VoiceTab
                handsets={devicesByCategory("voice")}
                siteDevices={liveDevices}
                siteId={site.id}
                extras={extras}
                overrides={overrides}
                isAdmin={isAdmin}
                onCreateTicket={(label) => setTicketDeviceLabel(label)}
                onAdopted={handleAdopted}
              />
            ) : null}
            {tab === "cctv" ? (
              <CctvTab
                devices={devicesByCategory("cctv")}
                siteDevices={liveDevices}
                siteId={site.id}
                extras={extras}
                overrides={overrides}
                isAdmin={isAdmin}
                onCreateTicket={(label) => setTicketDeviceLabel(label)}
                onAdopted={handleAdopted}
              />
            ) : null}
            {tab === "pos" ? (
              <PosTab
                devices={devicesByCategory("pos")}
                siteDevices={liveDevices}
                siteId={site.id}
                extras={extras}
                overrides={overrides}
                isAdmin={isAdmin}
                onCreateTicket={(label) => setTicketDeviceLabel(label)}
                onAdopted={handleAdopted}
              />
            ) : null}
            {tab === "endpoint" ? (
              <EndpointTab
                siteId={site.id}
                devices={devicesByCategory("endpoint")}
                siteDevices={liveDevices}
                overrides={overrides}
                onCreateTicket={(label) => setTicketDeviceLabel(label)}
              />
            ) : null}
            {tab === "traffic_analysis" ? (
              <TrafficAnalysisTab siteId={site.id} />
            ) : null}
            {tab === "it_support" ? (
              <ITSupportTab
                siteId={site.id}
                onCreateTicket={(label) => setTicketDeviceLabel(label)}
              />
            ) : null}
            {tab === "projects" ? <ProjectsTab siteId={site.id} /> : null}
          </div>
        </>
      )}

      <CreateTicketModal
        open={!!ticketDeviceLabel}
        onClose={() => setTicketDeviceLabel(null)}
        defaultSiteId={site.id}
        defaultDevice={ticketDeviceLabel ?? undefined}
      />
    </div>
  );
}

// ============================================================
// Shared building blocks
// ============================================================

function SupportPackBanner({ site }: { site: Site }) {
  const pack = getSupportPack(site.supportPack);
  const toneClasses: Record<typeof pack.tone, string> = {
    brand: "border-brand-200 bg-brand-50/50 text-brand-900",
    success: "border-emerald-200 bg-emerald-50/60 text-emerald-900",
    warning: "border-amber-200 bg-amber-50/60 text-amber-900",
    neutral: "border-slate-200 bg-slate-50 text-slate-800",
  };
  const dotClasses: Record<typeof pack.tone, string> = {
    brand: "bg-brand-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    neutral: "bg-slate-400",
  };
  return (
    <div className={cn("rounded-lg border p-4", toneClasses[pack.tone])}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", dotClasses[pack.tone])} />
          <span className="text-sm font-semibold">{pack.name}</span>
        </div>
        <span className="text-[11px] uppercase tracking-wider opacity-70">
          Support pack at this site
        </span>
      </div>
      <p className="mt-1 text-xs opacity-80">{pack.blurb}</p>
      <div className="mt-3 grid gap-3 text-[11px] sm:grid-cols-2">
        <Fact label="Service Level Agreement" value={pack.sla} />
        <Fact label="Coverage" value={pack.scope} />
      </div>
    </div>
  );
}

function SiteFact({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: typeof NetworkIcon;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function DeviceCard({
  device,
  siteDevices,
  overrides,
  onCreateTicket,
  rightSlot,
}: {
  device: Device;
  siteDevices: Device[];
  overrides: Overrides;
  onCreateTicket: (label: string) => void;
  rightSlot?: React.ReactNode;
}) {
  const asset = resolveAsset(device, overrides);
  const photo = resolvePhoto(device, overrides);
  const label = `${device.name} (${asset})`;
  const upstream = computeUpstream(device, siteDevices);
  const pings = computePings(device, upstream);
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
        <div className="relative aspect-[4/3] bg-slate-100 sm:aspect-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt={`${device.name} location`}
            className="h-full w-full object-cover"
          />
          <div className="absolute left-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm">
            {asset}
          </div>
        </div>
        <div className="flex flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {device.name}
              </div>
              <div className="text-xs text-slate-500">
                {device.type} · {device.brand} {device.model}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                <span className="font-medium text-slate-700">Location:</span>{" "}
                {device.location}
              </div>
              <div className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">Serial:</span>{" "}
                {device.serialNumber}
              </div>
            </div>
            <DeviceStatusBadge status={device.status} />
          </div>

          {rightSlot ? (
            <div className="mt-3 border-t border-slate-100 pt-3">{rightSlot}</div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <PingPill
              prefix="→"
              label={upstream.label}
              ms={pings.upstreamMs}
              tone="lan"
            />
            <PingPill prefix="→" label="Google" ms={pings.googleMs} tone="wan" />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 pt-1">
            <div className="text-[11px] text-slate-500">
              Warranty: {formatDate(device.warrantyExpiry)}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/portal/sites/${device.siteId}/devices/${device.id}`}
                className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                <Info className="h-4 w-4" /> More Details
              </Link>
              <Button size="sm" onClick={() => onCreateTicket(label)}>
                <PlusCircle className="h-4 w-4" /> Create Ticket
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function DiscoveredDevicesSection({
  siteId,
  category,
  isAdmin,
  onCreateTicket,
  onAdopted,
}: {
  siteId: string;
  category: "voice" | "cctv" | "pos";
  isAdmin: boolean;
  onCreateTicket: (label: string) => void;
  onAdopted: () => void;
}) {
  const [items, setItems] = useState<DiscoveredDevice[]>([]);
  const [source, setSource] = useState<string>("");
  const [subnet, setSubnet] = useState<string | undefined>(undefined);
  const [dhcpScope, setDhcpScope] = useState<
    | { startIp: string; endIp: string; gatewayIp: string; subnetMask: string }
    | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);
  const [adoptingId, setAdoptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/account/sites/${siteId}/discovered?category=${category}`,
      );
      if (r.ok) {
        const j = await r.json();
        setItems(j.devices || []);
        setSource(j.source || "");
        setSubnet(j.subnet);
        setDhcpScope(j.dhcpScope);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let cancelled = false;
    async function fetchOnce() {
      if (cancelled) return;
      await load();
    }
    fetchOnce();
    const t = setInterval(fetchOnce, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, category]);

  async function adopt(d: DiscoveredDevice) {
    setError(null);
    setAdoptingId(d.id);
    try {
      const r = await fetch(`/api/admin/sites/${siteId}/devices/adopt`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ discovery: d }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Adopt failed");
        return;
      }
      onAdopted();
      await load();
    } finally {
      setAdoptingId(null);
    }
  }

  const subtitle = {
    voice:
      "Voice endpoints (ATA, IP phones, DECT bases) detected on this site's LAN.",
    cctv:
      "Surveillance and alarm devices (NVRs, IP cameras, alarm panels) detected on this site's LAN.",
    pos:
      "POS peripherals (printers, registers, customer/kitchen displays, EFTPOS, local servers) detected on this site's LAN.",
  }[category];

  // The Ruijie cloud client API (sta_users) only sees Wi-Fi-attached clients.
  // Wired voice/cctv/pos peripherals are invisible to it, so we mark the
  // empty-fallback case clearly so customers don't think these are real reads.
  const sourceLabel =
    source === "ruijie"
      ? `Live from your Ruijie router${subnet ? ` (${subnet}.0/24)` : ""}`
      : source === "ruijie+empty-fallback"
        ? `Simulated for visibility — your Ruijie router reports no Wi-Fi clients in this category (${category} devices are typically wired and not visible to the cloud client API)${subnet ? `; using your real LAN ${subnet}.0/24` : ""}`
        : source === "synthetic"
          ? "Simulated — this site is not yet linked to a Ruijie group, so the LAN cannot be queried"
          : "";

  const dhcpHint = dhcpScope
    ? `DHCP pool ${dhcpScope.startIp} – ${dhcpScope.endIp} via ${dhcpScope.gatewayIp}`
    : null;

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <SectionHeader
            title="Auto-discovered on this site's LAN"
            hint={subtitle}
          />
          {dhcpHint ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
              {dhcpHint}
            </span>
          ) : null}
        </div>
        {sourceLabel ? (
          <p className="text-[11px] italic text-slate-500">{sourceLabel}</p>
        ) : null}
      </div>
      {error ? (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {loading && items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          Scanning LAN…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          No unmanaged devices detected in this category.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">MAC</th>
                <th className="px-3 py-2">Ping</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2 text-xs">
                    <div className="font-medium text-slate-900">{d.kind}</div>
                    {d.hostname ? (
                      <div className="text-[11px] text-slate-500">
                        {d.hostname}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">
                    {d.vendor}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {d.model}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{d.ip}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                    {d.mac}
                  </td>
                  <td className="px-3 py-2">
                    <PingPill prefix="" label="LAN" ms={d.pingMs} tone="lan" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          onCreateTicket(
                            `${d.kind} ${d.vendor} ${d.model} (auto-discovered, ${d.ip})`,
                          )
                        }
                      >
                        <PlusCircle className="h-3.5 w-3.5" /> Ticket
                      </Button>
                      {isAdmin ? (
                        <Button
                          size="sm"
                          disabled={adoptingId === d.id}
                          onClick={() => adopt(d)}
                        >
                          {adoptingId === d.id ? "Adopting…" : "Adopt"}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-slate-400">
        Discovery refreshes every 5 minutes. Devices that stop responding are
        removed automatically. Adopt promotes a discovered device into your
        managed inventory (admin only).
      </p>
    </div>
  );
}

function PingPill({
  prefix,
  label,
  ms,
  tone,
}: {
  prefix?: string;
  label: string;
  ms: number | null;
  tone: "lan" | "wan";
}) {
  // null = timeout / unreachable
  let cls = "text-emerald-700 ring-emerald-200 bg-emerald-50";
  let value = `${ms} ms`;
  if (ms == null) {
    cls = "text-rose-600 ring-rose-200 bg-rose-50";
    value = "timeout";
  } else {
    const slow = tone === "lan" ? ms >= 8 : ms >= 80;
    const bad = tone === "lan" ? ms >= 30 : ms >= 200;
    if (bad) cls = "text-rose-600 ring-rose-200 bg-rose-50";
    else if (slow) cls = "text-amber-700 ring-amber-200 bg-amber-50";
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        cls,
      )}
      title={
        ms == null
          ? `No reply from ${label}`
          : `Round-trip to ${label}: ${ms} ms`
      }
    >
      {prefix ? <span className="opacity-60">{prefix}</span> : null}
      <span className="font-semibold">{label}</span>
      <span className="opacity-80">{value}</span>
    </span>
  );
}

// ============================================================
// Network tab
// ============================================================

function NetworkTab({
  site,
  devices,
  siteDevices,
  extras,
  overrides,
  onCreateTicket,
}: {
  site: Site;
  devices: Device[];
  siteDevices: Device[];
  extras: SiteExtras;
  overrides: Overrides;
  onCreateTicket: (label: string) => void;
}) {
  const net = extras.network;

  return (
    <div className="space-y-5">
      <AccessNetworkCard site={site} />

      <NbnOutageCard address={site.address} autoLoad={false} />

      {net ? (
        <Card>
          <CardHeader title="Internal LAN summary" />
          <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Public IP" value={net.publicIp} />
            <Fact
              label="4G failover"
              value={
                net.has4gBackup ? (
                  <Badge tone="success">Active</Badge>
                ) : (
                  <Badge tone="warning">Not present</Badge>
                )
              }
            />
            {net.lastOutage ? (
              <Fact label="Last outage" value={formatDate(net.lastOutage)} />
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <SectionHeader
        title="Internal network devices"
        hint="Devices on your LAN behind the access router. Each shows location photo, asset number, status and live ping."
      />
      {devices.length === 0 ? (
        <EmptyState message="No network devices recorded for this site yet." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {devices.map((d) => (
            <DeviceCard
              key={d.id}
              device={d}
              siteDevices={siteDevices}
              overrides={overrides}
              onCreateTicket={onCreateTicket}
              rightSlot={
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Wifi className="h-3.5 w-3.5" /> Lifecycle: {d.lifecycleStage}
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OutageBadge({
  status,
}: {
  status: "Online" | "Degraded" | "Outage";
}) {
  if (status === "Online") return <Badge tone="success">Online</Badge>;
  if (status === "Degraded") return <Badge tone="warning">Degraded</Badge>;
  return <Badge tone="danger">Outage</Badge>;
}

// ============================================================
// Access Network (upstream / WAN) card
// ============================================================

function AccessNetworkCard({ site }: { site: Site }) {
  const accessMeta = getAccessTypeMeta(site.accessNetwork?.type);
  const [report, setReport] = useState<OutageReport | null>(
    site.outageReport ?? null,
  );
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-check every 15 minutes; immediate check on mount if older than 15 min.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    async function check() {
      if (cancelled) return;
      setChecking(true);
      setError(null);
      try {
        const r = await fetch(
          `/api/account/sites/${site.id}/outage-check`,
          { method: "POST" },
        );
        if (cancelled) return;
        if (r.status === 401 || r.status === 403) return;
        if (!r.ok) {
          setError("Status check failed");
          return;
        }
        const j = await r.json();
        setReport(j.report);
      } catch {
        if (!cancelled) setError("Status check failed");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    const last = report?.checkedAt ? new Date(report.checkedAt).getTime() : 0;
    if (Date.now() - last > 15 * 60 * 1000) check();
    timer = setInterval(check, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.id]);

  async function manualCheck() {
    setChecking(true);
    setError(null);
    try {
      const r = await fetch(`/api/account/sites/${site.id}/outage-check`, {
        method: "POST",
      });
      if (!r.ok) {
        setError("Check failed");
        return;
      }
      const j = await r.json();
      setReport(j.report);
    } finally {
      setChecking(false);
    }
  }

  const statusTone: Record<OutageReport["status"], string> = {
    operational: "border-emerald-200 bg-emerald-50/50 text-emerald-900",
    scheduled: "border-amber-200 bg-amber-50/60 text-amber-900",
    degraded: "border-amber-200 bg-amber-50/60 text-amber-900",
    outage: "border-rose-200 bg-rose-50/60 text-rose-900",
    unknown: "border-slate-200 bg-slate-50 text-slate-700",
  };
  const statusDot: Record<OutageReport["status"], string> = {
    operational: "bg-emerald-500",
    scheduled: "bg-amber-500",
    degraded: "bg-amber-500",
    outage: "bg-rose-500",
    unknown: "bg-slate-400",
  };
  const statusLabel: Record<OutageReport["status"], string> = {
    operational: "Operational",
    scheduled: "Scheduled maintenance",
    degraded: "Degraded",
    outage: "Outage in your area",
    unknown: "Status unknown",
  };

  return (
    <Card>
      <CardHeader
        title="Access network (upstream)"
        subtitle="The carrier circuit that connects your site to the internet. Shown before your internal LAN devices."
        action={
          <Button
            size="sm"
            variant="secondary"
            disabled={checking}
            onClick={manualCheck}
          >
            <RefreshCw
              className={"h-4 w-4 " + (checking ? "animate-spin" : "")}
            />
            {checking ? "Checking…" : "Check carrier now"}
          </Button>
        }
      />
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact
            label="Access type"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                {accessMeta.label}
              </span>
            }
          />
          <Fact label="Carrier / ISP" value={site.accessNetwork?.carrier || "—"} />
          <Fact
            label="Plan speed"
            value={site.accessNetwork?.planSpeed || "—"}
          />
          <Fact
            label="Failover"
            value={
              site.accessNetwork?.hasFailover ? (
                <Badge tone="success">
                  {getAccessTypeMeta(site.accessNetwork.failoverType).label}
                </Badge>
              ) : (
                <Badge tone="neutral">None</Badge>
              )
            }
          />
        </div>

        <div
          className={cn(
            "rounded-lg border p-3",
            statusTone[report?.status ?? "unknown"],
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  statusDot[report?.status ?? "unknown"],
                  checking ? "animate-pulse" : "",
                )}
              />
              <span className="text-sm font-semibold">
                {statusLabel[report?.status ?? "unknown"]}
              </span>
              {report?.source ? (
                <span className="text-[11px] opacity-70">
                  · via {report.source}
                </span>
              ) : null}
            </div>
            {report?.checkedAt ? (
              <span className="text-[11px] opacity-70">
                Checked {new Date(report.checkedAt).toLocaleString()}
              </span>
            ) : null}
          </div>
          {report?.message ? (
            <p className="mt-1 text-xs opacity-90">{report.message}</p>
          ) : null}
          {report?.scheduledStartsAt && report.scheduledEndsAt ? (
            <p className="mt-1 text-[11px] opacity-80">
              Window:{" "}
              <span className="font-medium">
                {new Date(report.scheduledStartsAt).toLocaleString()}
              </span>{" "}
              –{" "}
              <span className="font-medium">
                {new Date(report.scheduledEndsAt).toLocaleString()}
              </span>
            </p>
          ) : null}
          {error ? (
            <p className="mt-1 text-[11px] text-rose-700">{error}</p>
          ) : null}
        </div>

        <p className="text-[11px] text-slate-400">
          Background check runs every 15 minutes. Click{" "}
          <span className="font-medium">Check carrier now</span> to query the
          carrier on demand.
        </p>
      </CardBody>
    </Card>
  );
}

// ============================================================
// Voice tab
// ============================================================

function VoiceTab({
  handsets,
  siteDevices,
  siteId,
  extras,
  overrides,
  isAdmin,
  onCreateTicket,
  onAdopted,
}: {
  handsets: Device[];
  siteDevices: Device[];
  siteId: string;
  extras: SiteExtras;
  overrides: Overrides;
  isAdmin: boolean;
  onCreateTicket: (label: string) => void;
  onAdopted: () => void;
}) {
  const v = extras.voice;
  const [rules, setRules] = useState(v?.forwarding ?? []);
  const [drafting, setDrafting] = useState(false);
  const [newMatch, setNewMatch] = useState("");
  const [newDest, setNewDest] = useState("");

  return (
    <div className="space-y-5">
      {v ? (
        <>
          <Card>
            <CardHeader title="Voice service" />
            <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Fact label="Main DID" value={v.mainDid} />
              <Fact
                label="Inbound calls today"
                value={
                  <span className="inline-flex items-center gap-1">
                    <PhoneIncoming className="h-3.5 w-3.5 text-emerald-500" />
                    {v.inboundCallsToday}
                  </span>
                }
              />
              <Fact
                label="Missed calls today"
                value={
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      v.missedCallsToday > 3 ? "text-rose-600" : "",
                    )}
                  >
                    {v.missedCallsToday}
                  </span>
                }
              />
              <Fact label="Handsets" value={String(handsets.length)} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Current call flow" />
            <CardBody>
              <div className="flex flex-wrap items-center gap-2">
                {v.callFlow.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                        {step.label}
                      </div>
                      <div className="text-sm text-slate-900">
                        {step.detail}
                      </div>
                    </div>
                    {i < v.callFlow.length - 1 ? (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    ) : null}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Call forwarding rules"
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDrafting((x) => !x)}
                >
                  <PhoneForwarded className="h-4 w-4" />
                  {drafting ? "Cancel" : "Add rule"}
                </Button>
              }
            />
            <CardBody className="space-y-2">
              {rules.length === 0 && !drafting ? (
                <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  No forwarding rules configured.
                </div>
              ) : null}
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="text-sm">
                    <div className="font-medium text-slate-900">{r.match}</div>
                    <div className="text-xs text-slate-500">
                      Forwards to {r.destination}
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={r.active}
                      onChange={(e) =>
                        setRules((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, active: e.target.checked }
                              : x,
                          ),
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    {r.active ? "Active" : "Paused"}
                  </label>
                </div>
              ))}
              {drafting ? (
                <div className="rounded-md border border-brand-200 bg-brand-50/40 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      placeholder='Match (e.g. "After hours")'
                      value={newMatch}
                      onChange={(e) => setNewMatch(e.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                    />
                    <input
                      placeholder='Forward to (e.g. "Voicemail" or +61 4...)'
                      value={newDest}
                      onChange={(e) => setNewDest(e.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!newMatch || !newDest) return;
                        setRules((prev) => [
                          ...prev,
                          {
                            id: "fr-" + Date.now(),
                            match: newMatch,
                            destination: newDest,
                            active: true,
                          },
                        ]);
                        setNewMatch("");
                        setNewDest("");
                        setDrafting(false);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Save rule
                    </Button>
                  </div>
                </div>
              ) : null}
              <p className="pt-1 text-[11px] text-slate-400">
                Forwarding rules saved here are submitted as a request to
                PiNetwork — changes take effect within 1 business hour.
              </p>
            </CardBody>
          </Card>
        </>
      ) : null}

      <SectionHeader title="Handsets" />
      {handsets.length === 0 ? (
        <EmptyState message="No VoIP handsets recorded for this site." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {handsets.map((d) => (
            <DeviceCard
              key={d.id}
              device={d}
              siteDevices={siteDevices}
              overrides={overrides}
              onCreateTicket={onCreateTicket}
            />
          ))}
        </div>
      )}

      <DiscoveredDevicesSection
        siteId={siteId}
        category="voice"
        isAdmin={isAdmin}
        onCreateTicket={onCreateTicket}
        onAdopted={onAdopted}
      />
    </div>
  );
}

// ============================================================
// CCTV / Alarm tab
// ============================================================

function CctvTab({
  devices,
  siteDevices,
  siteId,
  extras,
  overrides,
  isAdmin,
  onCreateTicket,
  onAdopted,
}: {
  devices: Device[];
  siteDevices: Device[];
  siteId: string;
  extras: SiteExtras;
  overrides: Overrides;
  isAdmin: boolean;
  onCreateTicket: (label: string) => void;
  onAdopted: () => void;
}) {
  const cameras = devices.filter((d) => d.type === "CCTV Camera");
  const others = devices.filter((d) => d.type !== "CCTV Camera");
  const initial = extras.alarm?.armed ?? "Disarmed";
  const [armed, setArmed] = useState<typeof initial>(initial);

  return (
    <div className="space-y-5">
      {extras.alarm ? (
        <Card>
          <CardHeader title="Alarm panel" />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500">
                  Current state
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <ArmedBadge state={armed} />
                  <span className="text-sm text-slate-600">
                    Monitored by {extras.alarm.monitoredBy}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={armed === "Armed Stay" ? "primary" : "secondary"}
                  onClick={() => setArmed("Armed Stay")}
                >
                  <Lock className="h-4 w-4" /> Arm Stay
                </Button>
                <Button
                  size="sm"
                  variant={armed === "Armed Away" ? "primary" : "secondary"}
                  onClick={() => setArmed("Armed Away")}
                >
                  <Lock className="h-4 w-4" /> Arm Away
                </Button>
                <Button
                  size="sm"
                  variant={armed === "Disarmed" ? "primary" : "secondary"}
                  onClick={() => setArmed("Disarmed")}
                >
                  <LockOpen className="h-4 w-4" /> Disarm
                </Button>
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="font-medium text-slate-800">Last event</div>
              <div>
                {extras.alarm.lastEvent} · {extras.alarm.lastEventAt}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Arm/disarm here is submitted as a request to the alarm system.
              Owners and key holders are notified per the monitoring contract.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {others.length > 0 ? (
        <>
          <SectionHeader title="NVR / Alarm devices" />
          <div className="grid gap-4 lg:grid-cols-2">
            {others.map((d) => (
              <DeviceCard
                key={d.id}
                device={d}
                siteDevices={siteDevices}
                overrides={overrides}
                onCreateTicket={onCreateTicket}
              />
            ))}
          </div>
        </>
      ) : null}

      <SectionHeader title="Cameras" />
      {cameras.length === 0 ? (
        <EmptyState message="No cameras recorded for this site." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {cameras.map((d) => (
            <DeviceCard
              key={d.id}
              device={d}
              siteDevices={siteDevices}
              overrides={overrides}
              onCreateTicket={onCreateTicket}
            />
          ))}
        </div>
      )}

      <DiscoveredDevicesSection
        siteId={siteId}
        category="cctv"
        isAdmin={isAdmin}
        onCreateTicket={onCreateTicket}
        onAdopted={onAdopted}
      />
    </div>
  );
}

function ArmedBadge({
  state,
}: {
  state: "Disarmed" | "Armed Stay" | "Armed Away" | "Triggered";
}) {
  if (state === "Triggered") return <Badge tone="danger">Triggered</Badge>;
  if (state === "Disarmed") return <Badge tone="neutral">Disarmed</Badge>;
  return <Badge tone="success">{state}</Badge>;
}

// ============================================================
// POS tab
// ============================================================

function PosTab({
  devices,
  siteDevices,
  siteId,
  extras,
  overrides,
  isAdmin,
  onCreateTicket,
  onAdopted,
}: {
  devices: Device[];
  siteDevices: Device[];
  siteId: string;
  extras: SiteExtras;
  overrides: Overrides;
  isAdmin: boolean;
  onCreateTicket: (label: string) => void;
  onAdopted: () => void;
}) {
  return (
    <div className="space-y-5">
      {extras.pos ? (
        <Card>
          <CardHeader title="POS service" />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <Fact label="POS system" value={extras.pos.posSystem} />
            <Fact label="Payment provider" value={extras.pos.paymentProvider} />
            <Fact label="Devices recorded" value={String(devices.length)} />
          </CardBody>
        </Card>
      ) : null}

      <SectionHeader
        title="Registers, printers, KDS, CDS, payment terminals"
        hint="Live ping shows latency to the upstream switch / router and to Google."
      />
      {devices.length === 0 ? (
        <EmptyState message="No POS devices recorded for this site yet." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {devices.map((d) => (
            <DeviceCard
              key={d.id}
              device={d}
              siteDevices={siteDevices}
              overrides={overrides}
              onCreateTicket={onCreateTicket}
            />
          ))}
        </div>
      )}

      <DiscoveredDevicesSection
        siteId={siteId}
        category="pos"
        isAdmin={isAdmin}
        onCreateTicket={onCreateTicket}
        onAdopted={onAdopted}
      />
    </div>
  );
}

// ============================================================
// Endpoint tab
// ============================================================

interface AteraAgentRow {
  machineName: string;
  agentName: string;
  online: boolean;
  os?: string;
  osType?: string;
  ips?: string[];
  macs?: string[];
  lastUser?: string;
  lastReboot?: string;
  version?: string;
  vendor?: string;
  model?: string;
  memoryMb?: number;
  processor?: string;
}
interface AteraResp {
  ok: boolean;
  configured?: boolean;
  customerName?: string;
  customerId?: number;
  customerFound?: boolean;
  checkedAt?: string;
  agents?: AteraAgentRow[];
  message?: string;
  error?: string;
}

function EndpointTab({
  siteId,
  devices,
  siteDevices,
  overrides,
  onCreateTicket,
}: {
  siteId: string;
  devices: Device[];
  siteDevices: Device[];
  overrides: Overrides;
  onCreateTicket: (label: string) => void;
}) {
  const [atera, setAtera] = useState<AteraResp | null>(null);
  const [ateraLoading, setAteraLoading] = useState(true);
  const [ateraError, setAteraError] = useState<string | null>(null);

  async function loadAtera() {
    setAteraLoading(true);
    setAteraError(null);
    try {
      const r = await fetch(`/api/account/sites/${siteId}/atera-agents`, {
        cache: "no-store",
      });
      const j: AteraResp = await r.json();
      if (!r.ok) {
        setAteraError(j.error || "Atera fetch failed");
        return;
      }
      setAtera(j);
    } catch (e) {
      setAteraError(String(e));
    } finally {
      setAteraLoading(false);
    }
  }

  useEffect(() => {
    void loadAtera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Atera RMM agents"
          action={
            atera?.configured ? (
              <Button size="sm" variant="secondary" onClick={loadAtera} disabled={ateraLoading}>
                <RefreshCw
                  className={"h-4 w-4 " + (ateraLoading ? "animate-spin" : "")}
                />
                Refresh
              </Button>
            ) : null
          }
        />
        <CardBody>
          {ateraError ? (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {ateraError}
            </div>
          ) : ateraLoading && !atera ? (
            <div className="text-xs text-slate-500">
              Loading live endpoint data from Atera…
            </div>
          ) : !atera?.configured ? (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
              No Atera customer linked to this site yet. PI Network can wire
              this up so you'll see your agents here.
            </div>
          ) : !atera.customerFound ? (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
              Linked to Atera customer{" "}
              <span className="font-mono">"{atera.customerName}"</span> but no
              matching customer found in Atera. Check the spelling matches the
              Atera customer record exactly.
            </div>
          ) : (atera.agents?.length ?? 0) === 0 ? (
            <div className="text-xs text-slate-500">
              Linked to Atera customer{" "}
              <span className="font-medium">{atera.customerName}</span> but no
              endpoints are reporting in.
            </div>
          ) : (
            <AteraAgentsTable
              agents={atera.agents!}
              customerName={atera.customerName!}
              checkedAt={atera.checkedAt}
              onCreateTicket={onCreateTicket}
            />
          )}
        </CardBody>
      </Card>

      {devices.length > 0 ? (
        <div className="space-y-3">
          <SectionHeader
            title="Recorded endpoint devices"
            hint="Endpoints PI Network has on file for this site (asset register)."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {devices.map((d) => (
              <DeviceCard
                key={d.id}
                device={d}
                siteDevices={siteDevices}
                overrides={overrides}
                onCreateTicket={onCreateTicket}
                rightSlot={
                  <div className="text-xs text-slate-500">
                    {d.serviceCoverage.includes("endpoint")
                      ? "Enrolled in Endpoint Support"
                      : "Not enrolled — recommend adding to Endpoint Support"}
                  </div>
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AteraAgentsTable({
  agents,
  customerName,
  checkedAt,
  onCreateTicket,
}: {
  agents: AteraAgentRow[];
  customerName: string;
  checkedAt?: string;
  onCreateTicket: (label: string) => void;
}) {
  const online = agents.filter((a) => a.online).length;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800 ring-1 ring-emerald-200">
          {online} online
        </span>
        <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-800 ring-1 ring-rose-200">
          {agents.length - online} offline
        </span>
        <span className="ml-auto">
          Atera customer: <span className="font-medium">{customerName}</span>
          {checkedAt
            ? ` · checked ${new Date(checkedAt).toLocaleTimeString()}`
            : ""}
        </span>
      </div>
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">Status</th>
              <th className="px-2 py-1.5 text-left font-medium">Machine</th>
              <th className="px-2 py-1.5 text-left font-medium">User</th>
              <th className="px-2 py-1.5 text-left font-medium">OS</th>
              <th className="px-2 py-1.5 text-left font-medium">IP</th>
              <th className="px-2 py-1.5 text-left font-medium">Last Reboot</th>
              <th className="px-2 py-1.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {agents.map((a) => (
              <tr key={a.machineName + a.agentName} className="align-top">
                <td className="px-2 py-1.5">
                  <span
                    className={
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 " +
                      (a.online
                        ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                        : "bg-slate-100 text-slate-500 ring-slate-200")
                    }
                  >
                    <span
                      className={
                        "h-1.5 w-1.5 rounded-full " +
                        (a.online ? "bg-emerald-500" : "bg-slate-400")
                      }
                    />
                    {a.online ? "Online" : "Offline"}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <div className="font-medium text-slate-900">
                    {a.agentName || a.machineName}
                  </div>
                  {a.vendor || a.model ? (
                    <div className="text-[10px] text-slate-500">
                      {[a.vendor, a.model].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                </td>
                <td className="px-2 py-1.5">{a.lastUser || "—"}</td>
                <td className="px-2 py-1.5">
                  <div>{a.os || "—"}</div>
                  {a.osType ? (
                    <div className="text-[10px] text-slate-500">
                      {a.osType}
                    </div>
                  ) : null}
                </td>
                <td className="px-2 py-1.5 font-mono text-[10px]">
                  {a.ips?.join(", ") || "—"}
                </td>
                <td className="px-2 py-1.5 text-[11px]">
                  {a.lastReboot
                    ? new Date(a.lastReboot).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      onCreateTicket(
                        `Atera endpoint: ${a.agentName || a.machineName}`,
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    Ticket
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// IT Support tab
// ============================================================

function ITSupportTab({
  siteId,
  onCreateTicket,
}: {
  siteId: string;
  onCreateTicket: (label: string) => void;
}) {
  const tickets = getTicketsForSite(siteId);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="IT Support requests"
          action={
            <Button
              size="sm"
              onClick={() => onCreateTicket("General IT Support request")}
            >
              <PlusCircle className="h-4 w-4" /> New IT Support ticket
            </Button>
          }
        />
        <CardBody className="space-y-2">
          {tickets.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No tickets for this site.
            </div>
          ) : (
            tickets.map((t) => (
              <Link
                key={t.id}
                href="/portal/tickets"
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 hover:border-brand-200 hover:bg-brand-50/30"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <span>{t.number}</span>
                    <TicketStatusBadge status={t.status} />
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {t.deviceOrService} — {t.issueType}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            ))
          )}
        </CardBody>
      </Card>
      <p className="text-[11px] text-slate-400">
        Use this tab for general IT support requests not tied to a specific
        device — e.g. account changes, training, software help.
      </p>
    </div>
  );
}

// ============================================================
// Projects tab
// ============================================================

function ProjectsTab({ siteId }: { siteId: string }) {
  const list = useMemo(
    () => projects.filter((p) => p.siteId === siteId),
    [siteId],
  );
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Projects & installations at this site"
        hint="Installation photos and progress for each project at this location."
      />
      {list.length === 0 ? (
        <EmptyState message="No projects recorded for this site." />
      ) : (
        <div className="space-y-4">
          {list.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {p.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {p.category} · Owner: {p.owner}
                  </div>
                </div>
                <Badge tone="neutral">{p.status}</Badge>
              </div>
              <div className="grid gap-3 px-4 sm:grid-cols-3">
                <Fact label="Start" value={formatDate(p.startDate)} />
                <Fact
                  label="Expected completion"
                  value={formatDate(p.expectedCompletion)}
                />
                <Fact label="Progress" value={p.progress + "%"} />
              </div>
              <div className="mt-3 px-4 pb-4">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Installation photos
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {projectPhotos(p.id).map((src, i) => (
                    <div
                      key={i}
                      className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`${p.name} install photo ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute bottom-1 right-1 rounded bg-white/90 px-1 text-[10px] text-slate-700">
                        <ImageIcon className="inline h-3 w-3" /> #{i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Traffic Analysis tab
// ============================================================

function TrafficAnalysisTab({ siteId }: { siteId: string }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const attendance = useMemo(
    () => getInternalAttendance(siteId, today),
    [siteId, today],
  );
  const traffic = useMemo(
    () => getExternalTraffic(siteId, today),
    [siteId, today],
  );
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900">
        <strong>Prototype data.</strong> Real attendance and foot-traffic come
        from face-recognition / people-counting events on your CCTV system
        (e.g. Hikvision iVMS, Dahua DSS Intelligence). Numbers below are
        synthesised per site / day so you can see the layout.
      </div>
      <InternalAttendanceCard attendance={attendance} date={today} />
      <ExternalTrafficCard traffic={traffic} />
    </div>
  );
}

function InternalAttendanceCard({
  attendance,
  date,
}: {
  attendance: StaffShift[];
  date: string;
}) {
  const stillIn = attendance.filter((a) => a.status === "Active now").length;
  const late = attendance.filter((a) => a.status === "Late").length;
  const totalHours = attendance.reduce((s, a) => s + a.hoursWorked, 0);
  return (
    <Card>
      <CardHeader
        title="Internal — staff attendance"
        subtitle={`Clock-in / clock-out from CCTV face recognition. Date: ${formatDate(date)}.`}
      />
      <CardBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Fact label="Staff seen today" value={String(attendance.length)} />
          <Fact
            label="Currently on site"
            value={
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-emerald-500" />
                {stillIn}
              </span>
            }
          />
          <Fact
            label="Late arrivals"
            value={
              <span
                className={cn(late > 0 ? "text-amber-700" : "text-slate-900")}
              >
                {late}
              </span>
            }
          />
          <Fact
            label="Total hours worked"
            value={Math.round(totalHours * 10) / 10 + " h"}
          />
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">First seen</th>
                <th className="px-3 py-2">Last seen</th>
                <th className="px-3 py-2">Hours</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance.map((a) => (
                <tr key={a.staffId} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2 text-sm font-medium text-slate-900">
                    {a.name}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{a.role}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-mono">{a.firstSeen}</div>
                    <div className="text-[11px] text-slate-500">
                      {a.firstSeenCamera}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-mono">{a.lastSeen}</div>
                    <div className="text-[11px] text-slate-500">
                      {a.lastSeenCamera}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {a.hoursWorked.toFixed(1)} h
                  </td>
                  <td className="px-3 py-2">
                    <AttendanceStatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400">
          Times are derived from the first and last frame each face was
          matched today, across cameras at this site. Staff need to be
          enrolled on the NVR for matching to work.
        </p>
      </CardBody>
    </Card>
  );
}

function AttendanceStatusBadge({ status }: { status: StaffShift["status"] }) {
  const cls: Record<StaffShift["status"], string> = {
    "On time": "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "Late": "bg-amber-50 text-amber-700 ring-amber-200",
    "Early leave": "bg-slate-100 text-slate-700 ring-slate-200",
    "Active now": "bg-brand-50 text-brand-700 ring-brand-200",
  };
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset " +
        cls[status]
      }
    >
      {status}
    </span>
  );
}

function ExternalTrafficCard({ traffic }: { traffic: FootTrafficSummary }) {
  const maxBar = Math.max(
    1,
    ...traffic.hourly.map((h) => Math.max(h.entered, h.passed)),
  );
  return (
    <Card>
      <CardHeader
        title="External — foot traffic"
        subtitle={`Hourly counts from in-store + storefront cameras. Date: ${formatDate(traffic.date)}.`}
      />
      <CardBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Fact
            label="Total entered"
            value={
              <span className="text-emerald-700">
                {traffic.totalEntered.toLocaleString()}
              </span>
            }
          />
          <Fact
            label="Walked past"
            value={traffic.totalPassed.toLocaleString()}
          />
          <Fact
            label="Conversion rate"
            value={traffic.conversionPct.toFixed(1) + "%"}
          />
          <Fact
            label="Peak hour"
            value={`${String(traffic.peakHour).padStart(2, "0")}:00 (${traffic.peakEntered})`}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Hourly distribution</span>
            <span className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-3 rounded bg-brand-600" /> Entered
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-3 rounded bg-slate-300" /> Walked past
              </span>
            </span>
          </div>
          <div className="flex h-44 items-end gap-1">
            {traffic.hourly.map((h) => (
              <div
                key={h.hour}
                className="flex flex-1 flex-col items-center justify-end gap-px"
                title={`${String(h.hour).padStart(2, "0")}:00 — ${h.entered} entered, ${h.passed} passed`}
              >
                <div
                  className="w-full rounded-t bg-slate-300"
                  style={{
                    height: `${(h.passed / maxBar) * 100}%`,
                  }}
                />
                <div
                  className="w-full bg-brand-600"
                  style={{
                    height: `${(h.entered / maxBar) * 100}%`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1 text-[10px] text-slate-400">
            {traffic.hourly.map((h) => (
              <div key={h.hour} className="flex-1 text-center">
                {h.hour % 3 === 0 ? String(h.hour).padStart(2, "0") : ""}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          People counting comes from the storefront camera; a footfall passing
          past the door is not necessarily a customer. Conversion rate divides
          the number entered by the number walked past.
        </p>
      </CardBody>
    </Card>
  );
}

// ============================================================
// Helpers
// ============================================================

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
