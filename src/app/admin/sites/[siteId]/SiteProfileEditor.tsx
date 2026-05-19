"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Boxes,
  Camera,
  CreditCard,
  FileUp,
  Globe,
  Link2,
  Monitor,
  Phone,
  RefreshCw,
  Router,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Unlink,
  User,
  Wifi,
  X,
} from "lucide-react";
import { AddressAutocomplete } from "@/components/admin/AddressAutocomplete";

interface PingProbe {
  ip: string;
  reachable: boolean;
  latencyMs?: number;
}

type DeviceCategory =
  | "network_gear"
  | "voice"
  | "cctv"
  | "alarm"
  | "pos"
  | "endpoint"
  | "server"
  | "iot"
  | "unknown";

interface DiscoveredDevice {
  mac: string;
  ip?: string;
  hostname?: string;
  vendor?: string;
  guessedKind?: string;
  evidence: {
    dhcpVendorClass?: string;
    mdnsServices?: string[];
    httpUserAgents?: string[];
    tlsSnis?: string[];
    topPorts?: number[];
  };
  classification: DeviceCategory;
  classificationSource: "oui" | "llm" | "rule";
  confidence: "high" | "medium" | "low";
  rationale: string;
}

const CATEGORY_LABEL: Record<DeviceCategory, string> = {
  network_gear: "Network",
  voice: "Voice",
  cctv: "CCTV",
  alarm: "Alarm",
  pos: "POS",
  endpoint: "Endpoint",
  server: "Server",
  iot: "IoT",
  unknown: "Unknown",
};

const CATEGORY_BADGE: Record<DeviceCategory, string> = {
  network_gear: "bg-sky-100 text-sky-800 ring-sky-200",
  voice: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  cctv: "bg-violet-100 text-violet-800 ring-violet-200",
  alarm: "bg-rose-100 text-rose-800 ring-rose-200",
  pos: "bg-amber-100 text-amber-800 ring-amber-200",
  endpoint: "bg-slate-200 text-slate-800 ring-slate-300",
  server: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  iot: "bg-pink-100 text-pink-800 ring-pink-200",
  unknown: "bg-slate-100 text-slate-500 ring-slate-200",
};
interface ModuleStatusResponse {
  ok: boolean;
  camera: PingProbe | null;
  alarm: PingProbe | null;
  posTerminal: PingProbe | null;
}

const SERVICES: { key: string; label: string }[] = [
  { key: "network", label: "Network" },
  { key: "fourg_backup", label: "4G Backup" },
  { key: "voice", label: "Voice" },
  { key: "pos", label: "POS & Payments" },
  { key: "cctv", label: "CCTV & Alarm" },
  { key: "endpoint", label: "Endpoint" },
  { key: "it_support", label: "IT Support" },
  { key: "microsoft", label: "Microsoft" },
  { key: "projects", label: "Projects" },
];

const STATES = ["VIC", "NSW", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const HEALTHS = ["Healthy", "Warning", "Critical"];

interface SiteFormData {
  id: string;
  name: string;
  state: string;
  address: string;
  health: string;
  servicesCovered: string[];
  notes: string;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  contactEmail: string;
  ruijieGroupName: string;
  supportPack: string;
  lanSubnet: string;
  dhcpScope?: {
    startIp: string;
    endIp: string;
    subnetMask: string;
    gatewayIp: string;
  };
  accessType: string;
  accessCarrier: string;
  accessPlanSpeed: string;
  accessHasFailover: boolean;
  accessFailoverType: string;
  carbonServiceId?: number;
  carbonPoiName?: string;
  carbonServiceAlias?: string;
  // Module: Network
  networkVendor: string;
  networkSiteIdentifier: string;
  // Module: Voice
  voiceMode: string;
  voiceCustomDomain: string;
  voiceExtensions: string; // comma-separated; parsed to string[] on save
  // Module: CCTV / Alarm
  cctvCameraVendor: string;
  cctvAlarmVendor: string;
  cctvCameraIp: string;
  cctvAlarmIp: string;
  cctvCameraUser: string;
  cctvAlarmUser: string;
  /** new password to write; empty = leave existing unchanged */
  cctvCameraPasswordNew: string;
  cctvAlarmPasswordNew: string;
  cctvCameraPasswordSet: boolean;
  cctvAlarmPasswordSet: boolean;
  // Module: POS
  posVendor: string;
  posManaged: boolean;
  posSunmiSiteName: string;
  posTerminalIp: string;
  // Module: Endpoint
  endpointAteraCustomerName: string;
  // Coverage matrix (per service Yes/No/Partial/Recommended/—)
  coverage: Record<string, string>;
}

const NETWORK_VENDOR_OPTIONS = [
  { key: "", label: "— pick vendor —" },
  { key: "ruijie", label: "Ruijie Cloud" },
  { key: "ubiquiti", label: "Ubiquiti (UniFi)" },
  { key: "tplink", label: "TP-Link Omada" },
];

const VOICE_MODE_OPTIONS = [
  { key: "default_pbx", label: "Default — extension on PI Network PBX" },
  { key: "custom_domain", label: "Customer-private voice platform (custom domain)" },
];

const CAMERA_VENDOR_OPTIONS = [
  { key: "", label: "— pick camera brand —" },
  { key: "hikvision", label: "Hikvision" },
  { key: "dahua", label: "Dahua" },
  { key: "tplink", label: "TP-Link" },
  { key: "other", label: "Other" },
];

const ALARM_VENDOR_OPTIONS = [
  { key: "", label: "— pick alarm brand —" },
  { key: "hikvision", label: "Hikvision" },
  { key: "dahua", label: "Dahua" },
  { key: "ajax", label: "Ajax" },
  { key: "bosch", label: "Bosch" },
  { key: "other", label: "Other" },
];

const POS_VENDOR_OPTIONS = [
  { key: "", label: "— pick POS vendor —" },
  { key: "Abacus", label: "Abacus" },
  { key: "Pisell", label: "Pisell" },
  { key: "Square", label: "Square" },
];

const COVERAGE_SERVICES: { key: string; label: string }[] = [
  { key: "network", label: "Network" },
  { key: "fourg_backup", label: "4G Backup" },
  { key: "voice", label: "Voice" },
  { key: "pos", label: "POS & Payments" },
  { key: "cctv", label: "CCTV & Alarm" },
  { key: "endpoint", label: "Endpoint" },
  { key: "it_support", label: "IT Support" },
  { key: "microsoft", label: "Microsoft 365" },
  { key: "projects", label: "Projects" },
];

const CARRIER_OPTIONS = [
  "",
  "Telstra",
  "Aussie Broadband",
  "Superloop",
  "Lightning Broadband",
  "Uniti",
  "Other",
];

/** Aussie Broadband-aligned plan speeds. Grouped by tier in `optgroup`. */
const PLAN_SPEED_GROUPS: { label: string; options: string[] }[] = [
  {
    label: "Residential NBN",
    options: [
      "12/1 (Basic)",
      "25/5 (Standard)",
      "25/10 (Standard)",
      "50/20 (Standard Plus)",
      "100/20 (Premium)",
      "100/40 (Premium)",
      "250/25 (Superfast)",
      "1000/50 (Home Ultrafast)",
    ],
  },
  {
    label: "Business NBN / SLA",
    options: [
      "100/100 (Business SLA)",
      "250/100 (Business)",
      "500/200 (Business)",
      "1000/400 (Business Premium)",
    ],
  },
  {
    label: "Enterprise Ethernet (symmetric)",
    options: [
      "10/10",
      "20/20",
      "50/50",
      "100/100",
      "200/200",
      "500/500",
      "1000/1000",
    ],
  },
  {
    label: "Wireless / non-NBN",
    options: ["4G/5G LTE (variable)", "Starlink (variable)", "Opticomm (variable)"],
  },
];

interface CarbonServiceOption {
  id: number;
  alias?: string;
  address?: string;
  service_identifier?: string;
  status?: string;
  poi_name?: string;
}

const ACCESS_TYPE_OPTIONS = [
  { key: "NBN_FTTP", label: "NBN — FTTP (Fibre to the Premises)" },
  { key: "NBN_FTTC", label: "NBN — FTTC (Fibre to the Curb)" },
  { key: "NBN_FTTN", label: "NBN — FTTN (Fibre to the Node)" },
  { key: "NBN_HFC", label: "NBN — HFC" },
  { key: "NBN_FW", label: "NBN — Fixed Wireless" },
  { key: "NBN_EE", label: "NBN — Enterprise Ethernet" },
  { key: "Opticomm", label: "Opticomm" },
  { key: "Starlink", label: "Starlink" },
  { key: "Lightning", label: "Lightning Broadband" },
  { key: "4G", label: "4G LTE" },
  { key: "5G", label: "5G" },
  { key: "Other", label: "Other / unspecified" },
];

const SUPPORT_PACK_OPTIONS = [
  { key: "no_support", label: "No Support — service requests billable" },
  { key: "isp_only", label: "ISP Support Only — connectivity scope only" },
  {
    key: "essential",
    label: "Essential Bundle — full coverage, best effort",
  },
  {
    key: "protection",
    label: "Protection Bundle — full coverage, 24 BH SLA, onsite included",
  },
  {
    key: "enterprise_protection",
    label: "Enterprise Protection (customized) — per executed agreement",
  },
];

export function SiteProfileEditor({ initial }: { initial: SiteFormData }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [carbonOpen, setCarbonOpen] = useState(false);
  const [moduleStatus, setModuleStatus] = useState<ModuleStatusResponse | null>(
    null,
  );
  const [statusBusy, setStatusBusy] = useState(false);
  const [unifiBusy, setUnifiBusy] = useState(false);
  const [unifiResult, setUnifiResult] = useState<string | null>(null);
  const [ateraBusy, setAteraBusy] = useState(false);
  const [ateraResult, setAteraResult] = useState<string | null>(null);
  const [pcapBusy, setPcapBusy] = useState(false);
  const [pcapDevices, setPcapDevices] = useState<DiscoveredDevice[] | null>(
    null,
  );
  const [pcapMeta, setPcapMeta] = useState<string | null>(null);
  const [pcapError, setPcapError] = useState<string | null>(null);

  async function uploadPcap(file: File) {
    setPcapBusy(true);
    setPcapDevices(null);
    setPcapMeta(null);
    setPcapError(null);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/admin/sites/${data.id}/pcap`, {
        method: "POST",
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) {
        setPcapError(
          `${j.error || "discovery failed"}${j.detail ? ` — ${j.detail.slice(0, 200)}` : ""}`,
        );
        return;
      }
      setPcapMeta(
        `${j.filename} • ${(j.bytes / 1024 / 1024).toFixed(1)} MB • ${j.hostsCount} hosts seen • ${j.llmRefinedCount} classified by ${j.model || "LLM"}${j.usage?.total_tokens ? ` (${j.usage.total_tokens} tokens)` : ""}`,
      );
      setPcapDevices((j.devices as DiscoveredDevice[]) || []);
    } catch (e) {
      setPcapError(String(e));
    } finally {
      setPcapBusy(false);
    }
  }

  async function syncAtera() {
    setAteraBusy(true);
    setAteraResult(null);
    setError(null);
    try {
      const r = await fetch(`/api/admin/sites/${data.id}/sync-atera`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ateraCustomerName: data.endpointAteraCustomerName,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setAteraResult(j.error || "Sync failed");
        return;
      }
      setAteraResult(j.message || "Sync ok");
    } finally {
      setAteraBusy(false);
    }
  }

  async function syncUnifi() {
    setUnifiBusy(true);
    setUnifiResult(null);
    setError(null);
    try {
      const r = await fetch(`/api/admin/sites/${data.id}/sync-unifi`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteIdentifier: data.networkSiteIdentifier,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setUnifiResult(j.error || "Sync failed");
        return;
      }
      setUnifiResult(j.message || "Sync ok");
      router.refresh();
    } finally {
      setUnifiBusy(false);
    }
  }

  async function refreshModuleStatus() {
    if (
      !data.cctvCameraIp &&
      !data.cctvAlarmIp &&
      !data.posTerminalIp
    ) {
      setModuleStatus(null);
      return;
    }
    setStatusBusy(true);
    try {
      const r = await fetch(`/api/admin/sites/${data.id}/module-status`, {
        cache: "no-store",
      });
      if (r.ok) setModuleStatus((await r.json()) as ModuleStatusResponse);
    } finally {
      setStatusBusy(false);
    }
  }

  useEffect(() => {
    if (
      initial.cctvCameraIp ||
      initial.cctvAlarmIp ||
      initial.posTerminalIp
    ) {
      void refreshModuleStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function linkCarbon(svc: CarbonServiceOption) {
    setError(null);
    const r = await fetch(`/api/admin/sites/${data.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        carbonServiceId: svc.id,
        carbonPoiName: svc.poi_name ?? "",
        carbonServiceAlias: svc.alias ?? "",
      }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j.error || "Carbon link failed");
      return;
    }
    setData((prev) => ({
      ...prev,
      carbonServiceId: svc.id,
      carbonPoiName: svc.poi_name,
      carbonServiceAlias: svc.alias,
    }));
    setCarbonOpen(false);
    router.refresh();
  }

  async function unlinkCarbon() {
    if (!confirm("Unlink this site from its ABB Carbon service?")) return;
    const r = await fetch(`/api/admin/sites/${data.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ carbonServiceId: null }),
    });
    if (!r.ok) return;
    setData((prev) => ({
      ...prev,
      carbonServiceId: undefined,
      carbonPoiName: undefined,
      carbonServiceAlias: undefined,
    }));
    router.refresh();
  }

  async function syncRuijie() {
    setSyncing(true);
    setSyncMsg(null);
    setError(null);
    try {
      const groupName =
        (data.networkVendor === "ruijie" && data.networkSiteIdentifier.trim()) ||
        data.ruijieGroupName.trim();
      const body = groupName ? { groupName } : {};
      const r = await fetch(`/api/admin/sites/${data.id}/sync-ruijie`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Sync failed");
        return;
      }
      setSyncMsg(j.message || "Sync complete");
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  function patch<K extends keyof SiteFormData>(key: K, val: SiteFormData[K]) {
    setData((prev) => ({ ...prev, [key]: val }));
  }
  function toggleService(s: string) {
    setData((prev) => ({
      ...prev,
      servicesCovered: prev.servicesCovered.includes(s)
        ? prev.servicesCovered.filter((x) => x !== s)
        : [...prev.servicesCovered, s],
    }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const exts = data.voiceExtensions
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const networkModule = data.networkVendor
        ? {
            vendor: data.networkVendor,
            siteIdentifier: data.networkSiteIdentifier.trim(),
          }
        : null;
      // Mirror Ruijie group name into the legacy field so backend Ruijie sync
      // (which keys off ruijieGroupName) keeps working without portal changes.
      const ruijieGroupName =
        data.networkVendor === "ruijie"
          ? data.networkSiteIdentifier.trim()
          : data.ruijieGroupName.trim();
      const voiceModule = data.voiceMode
        ? {
            mode: data.voiceMode,
            customDomain: data.voiceCustomDomain.trim() || undefined,
            extensions: exts,
          }
        : null;
      const cctvModule =
        data.cctvCameraVendor ||
        data.cctvAlarmVendor ||
        data.cctvCameraIp ||
        data.cctvAlarmIp ||
        data.cctvCameraPasswordSet ||
        data.cctvAlarmPasswordSet
          ? {
              cameraVendor: data.cctvCameraVendor || undefined,
              alarmVendor: data.cctvAlarmVendor || undefined,
              cameraIp: data.cctvCameraIp.trim() || undefined,
              alarmIp: data.cctvAlarmIp.trim() || undefined,
              cameraUser: data.cctvCameraUser.trim() || undefined,
              alarmUser: data.cctvAlarmUser.trim() || undefined,
              cameraPassword: data.cctvCameraPasswordNew || undefined,
              alarmPassword: data.cctvAlarmPasswordNew || undefined,
            }
          : null;
      const posModule =
        data.posVendor || data.posTerminalIp
          ? {
              vendor: data.posVendor || undefined,
              managed: data.posManaged,
              sunmiSiteName: data.posManaged
                ? data.posSunmiSiteName.trim() || undefined
                : undefined,
              terminalIp: data.posTerminalIp.trim() || undefined,
            }
          : null;
      const endpointModule = data.endpointAteraCustomerName.trim()
        ? {
            ateraCustomerName: data.endpointAteraCustomerName.trim(),
          }
        : null;
      const coverage: Record<string, string> = {};
      for (const k of Object.keys(data.coverage)) {
        if (data.coverage[k]) coverage[k] = data.coverage[k];
      }

      const res = await fetch(`/api/admin/sites/${data.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          state: data.state,
          address: data.address,
          health: data.health,
          servicesCovered: data.servicesCovered,
          notes: data.notes,
          supportPack: data.supportPack,
          lanSubnet: data.lanSubnet,
          accessNetwork: {
            type: data.accessType,
            carrier: data.accessCarrier,
            planSpeed: data.accessPlanSpeed,
            hasFailover: data.accessHasFailover,
            failoverType: data.accessFailoverType || undefined,
          },
          mainContact: {
            name: data.contactName,
            role: data.contactRole,
            phone: data.contactPhone,
            email: data.contactEmail,
          },
          networkModule,
          ruijieGroupName,
          voiceModule,
          cctvModule,
          posModule,
          endpointModule,
          coverage,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Failed");
        return;
      }
      setSavedAt(new Date().toLocaleTimeString());
      // Clear write-only password fields; mark "set" if user typed a new one
      setData((prev) => ({
        ...prev,
        cctvCameraPasswordNew: "",
        cctvAlarmPasswordNew: "",
        cctvCameraPasswordSet:
          prev.cctvCameraPasswordSet || !!prev.cctvCameraPasswordNew,
        cctvAlarmPasswordSet:
          prev.cctvAlarmPasswordSet || !!prev.cctvAlarmPasswordNew,
      }));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !confirm(
        `Delete site "${data.name}"? This will also delete all its devices and uploaded photos. This cannot be undone.`,
      )
    )
      return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sites/${data.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Delete failed");
        setDeleting(false);
        return;
      }
      router.push("/admin/sites");
      router.refresh();
    } catch (e) {
      setError(String(e));
      setDeleting(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="space-y-5 rounded-lg border border-slate-200 bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          Site Profile
        </h2>
        {savedAt ? (
          <span className="text-xs text-emerald-600">Saved at {savedAt}</span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Site Name *">
          <input
            required
            value={data.name}
            onChange={(e) => patch("name", e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="State *">
          <select
            value={data.state}
            onChange={(e) => patch("state", e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Address *" wide>
          <AddressAutocomplete
            required
            value={data.address}
            onChange={(v) => patch("address", v)}
            placeholder="Start typing — Google suggests"
          />
        </Field>
        <Field label="Health">
          <select
            value={data.health}
            onChange={(e) => patch("health", e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            {HEALTHS.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Services Covered">
        <div className="flex flex-wrap gap-1.5">
          {SERVICES.map((s) => {
            const on = data.servicesCovered.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleService(s.key)}
                className={
                  "rounded-full px-3 py-1 text-xs font-medium transition " +
                  (on
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </Field>

      <fieldset className="rounded-lg border border-slate-200 p-3">
        <SectionLegend icon={User} label="Main Site Contact" />

        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Name">
            <input
              value={data.contactName}
              onChange={(e) => patch("contactName", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Role">
            <input
              value={data.contactRole}
              onChange={(e) => patch("contactRole", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Phone">
            <input
              value={data.contactPhone}
              onChange={(e) => patch("contactPhone", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={data.contactEmail}
              onChange={(e) => patch("contactEmail", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </fieldset>

      <Field label="Support Pack">
        <select
          value={data.supportPack}
          onChange={(e) => patch("supportPack", e.target.value)}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        >
          {SUPPORT_PACK_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Notes">
        <textarea
          rows={2}
          value={data.notes}
          onChange={(e) => patch("notes", e.target.value)}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      </Field>

      {carbonOpen ? (
        <CarbonSearchModal
          siteAddress={data.address}
          onClose={() => setCarbonOpen(false)}
          onPick={linkCarbon}
        />
      ) : null}

      <div className="space-y-5 rounded-lg border border-slate-300 bg-slate-50/60 p-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
            <Boxes className="h-5 w-5 text-brand-600" />
            Service Modules
          </h3>
          <span className="text-[11px] text-slate-500">
            Per-service configuration. Empty = not configured.
          </span>
        </div>

        <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <SectionLegend icon={Wifi} label="Network" />

          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Network Vendor">
              <select
                value={data.networkVendor}
                onChange={(e) => patch("networkVendor", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                {NETWORK_VENDOR_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Vendor-Side Site / Group Name">
              <input
                value={data.networkSiteIdentifier}
                onChange={(e) =>
                  patch("networkSiteIdentifier", e.target.value)
                }
                placeholder='e.g. "OKAMI_Bendigo"'
                disabled={!data.networkVendor}
                className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs disabled:bg-slate-50"
              />
            </Field>
            {data.networkVendor === "ruijie" ? (
              <button
                type="button"
                onClick={syncRuijie}
                disabled={syncing}
                className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
              >
                <RefreshCw
                  className={"h-3.5 w-3.5 " + (syncing ? "animate-spin" : "")}
                />
                {syncing ? "Syncing…" : "Sync from Ruijie"}
              </button>
            ) : null}
            {data.networkVendor === "ubiquiti" ? (
              <button
                type="button"
                onClick={syncUnifi}
                disabled={unifiBusy || !data.networkSiteIdentifier.trim()}
                className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
              >
                <RefreshCw
                  className={"h-3.5 w-3.5 " + (unifiBusy ? "animate-spin" : "")}
                />
                {unifiBusy ? "Probing UniFi…" : "Probe UniFi"}
              </button>
            ) : null}
          </div>
          {syncMsg ? (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {syncMsg}
            </div>
          ) : null}
          {unifiResult ? (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
              {unifiResult}
            </div>
          ) : null}
          {data.networkVendor === "ruijie" ? (
            <p className="text-[11px] text-slate-500">
              Pulls AP / Switch / Gateway inventory + current online status,
              and auto-detects this site's LAN /24 and gateway DHCP pool.
            </p>
          ) : null}
          {data.networkVendor === "tplink" ? (
            <p className="text-[11px] text-amber-700">
              TP-Link Omada integration not implemented yet — the identifier is
              stored for future use.
            </p>
          ) : null}

          <div className="rounded-md border border-slate-100 bg-slate-50/60 p-3">
            <SubsectionLegend
              icon={Globe}
              label="Access Network (Upstream WAN)"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Access Type">
                <select
                  value={data.accessType}
                  onChange={(e) => patch("accessType", e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  {ACCESS_TYPE_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Carrier / ISP">
                <select
                  value={
                    CARRIER_OPTIONS.includes(data.accessCarrier)
                      ? data.accessCarrier
                      : "__custom__"
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__custom__") return;
                    patch("accessCarrier", v);
                  }}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">— pick carrier —</option>
                  {CARRIER_OPTIONS.filter(Boolean).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  {CARRIER_OPTIONS.includes(data.accessCarrier) ? null : (
                    <option value="__custom__">{data.accessCarrier}</option>
                  )}
                </select>
              </Field>
              <Field label="Plan Speed">
                <select
                  value={data.accessPlanSpeed}
                  onChange={(e) => patch("accessPlanSpeed", e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">— pick plan speed —</option>
                  {PLAN_SPEED_GROUPS.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {data.accessPlanSpeed &&
                  !PLAN_SPEED_GROUPS.some((g) =>
                    g.options.includes(data.accessPlanSpeed),
                  ) ? (
                    <option value={data.accessPlanSpeed}>
                      {data.accessPlanSpeed} (custom)
                    </option>
                  ) : null}
                </select>
              </Field>
              <Field label="Failover Backup">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={data.accessHasFailover}
                    onChange={(e) =>
                      patch("accessHasFailover", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <select
                    disabled={!data.accessHasFailover}
                    value={data.accessFailoverType}
                    onChange={(e) =>
                      patch("accessFailoverType", e.target.value)
                    }
                    className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <option value="">— pick failover type —</option>
                    {ACCESS_TYPE_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Shown on the customer's Network tab above their internal devices.
              Drives the carrier outage check displayed there.
            </p>
          </div>

          <div className="rounded-md border border-slate-100 bg-slate-50/60 p-3">
            <SubsectionLegend icon={Link2} label="ABB Carbon Outage Link" />
            {data.carbonServiceId ? (
              <div className="space-y-2">
                <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900 ring-1 ring-emerald-200">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" />
                    <span className="font-semibold">
                      Carbon Service #{data.carbonServiceId}
                    </span>
                  </div>
                  {data.carbonServiceAlias ? (
                    <div className="mt-0.5 font-mono text-[11px] opacity-80">
                      {data.carbonServiceAlias}
                    </div>
                  ) : null}
                  {data.carbonPoiName ? (
                    <div className="mt-0.5 text-[11px] opacity-80">
                      POI:{" "}
                      <span className="font-medium">{data.carbonPoiName}</span>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCarbonOpen(true)}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    <Search className="h-3.5 w-3.5" /> Re-link
                  </button>
                  <button
                    type="button"
                    onClick={unlinkCarbon}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50"
                  >
                    <Unlink className="h-3.5 w-3.5" /> Unlink
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-600">
                  Not linked. Linking lets this site pull live outage status
                  from ABB Carbon (matched against the service's POI).
                </p>
                <button
                  type="button"
                  onClick={() => setCarbonOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
                >
                  <Search className="h-3.5 w-3.5" /> Search Carbon by Address
                </button>
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-100 bg-slate-50/60 p-3">
            <SubsectionLegend icon={Router} label="LAN Addressing" />
            <Field label='LAN /24 prefix (e.g. "192.168.99"). Auto-detected on Ruijie sync — override only if needed.'>
              <input
                value={data.lanSubnet}
                onChange={(e) => patch("lanSubnet", e.target.value)}
                placeholder="auto-detected"
                className="w-full max-w-xs rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </Field>
            {data.dhcpScope ? (
              <p className="mt-2 text-[11px] text-slate-600">
                <span className="font-medium text-slate-700">DHCP pool:</span>{" "}
                <span className="font-mono">
                  {data.dhcpScope.startIp} – {data.dhcpScope.endIp}
                </span>{" "}
                via gateway{" "}
                <span className="font-mono">{data.dhcpScope.gatewayIp}</span>{" "}
                (mask {data.dhcpScope.subnetMask}). Synthetic discovery is
                constrained to this range.
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-slate-500">
                DHCP pool not yet detected. Run "Sync from Ruijie" once.
              </p>
            )}
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 bg-white p-3">
          <SectionLegend
            icon={Activity}
            label="Device Discovery (Pcap Scan)"
          />

          <p className="mb-2 text-[11px] text-slate-500">
            Upload a packet capture from the site router (5 min recommended,
            max 120&nbsp;MB, .pcap / .pcapng / .cap). The server pulls
            ARP / DHCP / mDNS / HTTP-UA / TLS-SNI / port signals, looks each
            host up by MAC vendor (OUI), and asks the LLM to classify
            anything that's not obviously categorized. Files are deleted after
            analysis.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900">
              <FileUp className="h-3.5 w-3.5" />
              {pcapBusy ? "Scanning…" : "Upload pcap"}
              <input
                type="file"
                accept=".pcap,.pcapng,.cap"
                disabled={pcapBusy}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadPcap(f);
                  e.target.value = "";
                }}
              />
            </label>
            {pcapMeta ? (
              <span className="text-[11px] text-slate-500">{pcapMeta}</span>
            ) : null}
          </div>
          {pcapError ? (
            <div className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {pcapError}
            </div>
          ) : null}
          {pcapDevices ? (
            <DiscoveredDevicesTable devices={pcapDevices} />
          ) : null}
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 bg-white p-3">
          <SectionLegend icon={Phone} label="Voice" />

          <div className="space-y-2">
            <Field label="Mode">
              <select
                value={data.voiceMode}
                onChange={(e) => patch("voiceMode", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">— not configured —</option>
                {VOICE_MODE_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            {data.voiceMode === "custom_domain" ? (
              <Field label="Customer Voice Platform Domain">
                <input
                  value={data.voiceCustomDomain}
                  onChange={(e) =>
                    patch("voiceCustomDomain", e.target.value)
                  }
                  placeholder="voice.customer-domain.com.au"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </Field>
            ) : null}
            {data.voiceMode ? (
              <Field label="Extensions to Monitor (comma-separated)">
                <input
                  value={data.voiceExtensions}
                  onChange={(e) => patch("voiceExtensions", e.target.value)}
                  placeholder="201, 202, 203"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
                />
              </Field>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 bg-white p-3">
          <SectionLegend icon={Camera} label="CCTV & Alarm" />

          <div className="mb-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={refreshModuleStatus}
              disabled={
                statusBusy || (!data.cctvCameraIp && !data.cctvAlarmIp)
              }
              className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              <Activity
                className={"h-3.5 w-3.5 " + (statusBusy ? "animate-pulse" : "")}
              />
              {statusBusy ? "Pinging…" : "Ping check"}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 rounded-md border border-slate-100 p-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  CCTV
                </p>
                <PingBadge probe={moduleStatus?.camera ?? null} />
              </div>
              <Field label="Camera Brand">
                <select
                  value={data.cctvCameraVendor}
                  onChange={(e) =>
                    patch("cctvCameraVendor", e.target.value)
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  {CAMERA_VENDOR_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="NVR / Camera IP">
                <input
                  value={data.cctvCameraIp}
                  onChange={(e) => patch("cctvCameraIp", e.target.value)}
                  placeholder="192.168.x.x"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
                />
              </Field>
              <Field label="Username (default: admin)">
                <input
                  value={data.cctvCameraUser}
                  onChange={(e) =>
                    patch("cctvCameraUser", e.target.value)
                  }
                  placeholder="admin"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
                />
              </Field>
              <Field
                label={
                  data.cctvCameraPasswordSet
                    ? "Replace password (leave blank to keep)"
                    : "Set password"
                }
              >
                <input
                  type="password"
                  value={data.cctvCameraPasswordNew}
                  onChange={(e) =>
                    patch("cctvCameraPasswordNew", e.target.value)
                  }
                  placeholder={
                    data.cctvCameraPasswordSet ? "•••• (set)" : "not set"
                  }
                  autoComplete="new-password"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
                />
              </Field>
            </div>
            <div className="space-y-2 rounded-md border border-slate-100 p-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Alarm
                </p>
                <PingBadge probe={moduleStatus?.alarm ?? null} />
              </div>
              <Field label="Alarm Brand">
                <select
                  value={data.cctvAlarmVendor}
                  onChange={(e) => patch("cctvAlarmVendor", e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  {ALARM_VENDOR_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Alarm Panel IP">
                <input
                  value={data.cctvAlarmIp}
                  onChange={(e) => patch("cctvAlarmIp", e.target.value)}
                  placeholder="192.168.x.x"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
                />
              </Field>
              <Field label="Username">
                <input
                  value={data.cctvAlarmUser}
                  onChange={(e) => patch("cctvAlarmUser", e.target.value)}
                  placeholder="admin"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
                />
              </Field>
              <Field
                label={
                  data.cctvAlarmPasswordSet
                    ? "Replace password (leave blank to keep)"
                    : "Set password"
                }
              >
                <input
                  type="password"
                  value={data.cctvAlarmPasswordNew}
                  onChange={(e) =>
                    patch("cctvAlarmPasswordNew", e.target.value)
                  }
                  placeholder={
                    data.cctvAlarmPasswordSet ? "•••• (set)" : "not set"
                  }
                  autoComplete="new-password"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
                />
              </Field>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Passwords are write-only. They are stored encrypted server-side and
            never returned to the browser. Replace by typing a new value.
          </p>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 bg-white p-3">
          <SectionLegend icon={CreditCard} label="Point of Sale" />

          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-slate-500">
              On-Prem Terminal
            </span>
            <PingBadge probe={moduleStatus?.posTerminal ?? null} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="POS Vendor">
              <select
                value={data.posVendor}
                onChange={(e) => patch("posVendor", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                {POS_VENDOR_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Managed by Us?">
              <div className="flex h-9 items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.posManaged}
                  onChange={(e) => patch("posManaged", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs text-slate-600">
                  PI Network manages POS hardware (on Sunmi platform)
                </span>
              </div>
            </Field>
            {data.posManaged ? (
              <Field label="Sunmi Platform Site Name" wide>
                <input
                  value={data.posSunmiSiteName}
                  onChange={(e) =>
                    patch("posSunmiSiteName", e.target.value)
                  }
                  placeholder='e.g. "OKAMI Bendigo"'
                  className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
                />
              </Field>
            ) : null}
            <Field
              label="On-Prem POS Terminal / Gateway IP (optional, for ping)"
              wide
            >
              <input
                value={data.posTerminalIp}
                onChange={(e) => patch("posTerminalIp", e.target.value)}
                placeholder="192.168.x.x"
                className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </Field>
          </div>
          {!data.posManaged && data.posVendor ? (
            <p className="mt-2 text-[11px] text-slate-500">
              Customer-managed POS — track devices manually below in the device
              inventory.
            </p>
          ) : null}
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 bg-white p-3">
          <SectionLegend icon={Monitor} label="Endpoint Management" />


          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Atera Customer Name">
              <input
                value={data.endpointAteraCustomerName}
                onChange={(e) =>
                  patch("endpointAteraCustomerName", e.target.value)
                }
                placeholder='Atera "Customer" name (used to scope assets)'
                className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </Field>
            <button
              type="button"
              onClick={syncAtera}
              disabled={
                ateraBusy || !data.endpointAteraCustomerName.trim()
              }
              className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
            >
              <RefreshCw
                className={"h-3.5 w-3.5 " + (ateraBusy ? "animate-spin" : "")}
              />
              {ateraBusy ? "Probing Atera…" : "Probe Atera"}
            </button>
          </div>
          {ateraResult ? (
            <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
              {ateraResult}
            </div>
          ) : null}
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 bg-white p-3">
          <SectionLegend icon={ShieldCheck} label="Service Coverage Matrix" />
          <p className="mb-2 text-[11px] text-slate-500">
            For each service category, set the coverage status shown to the
            customer on their site overview. Leave blank for "not assessed".
          </p>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Service</th>
                  <th className="px-2 py-1.5 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {COVERAGE_SERVICES.map((s) => (
                  <tr key={s.key}>
                    <td className="px-2 py-1.5 text-slate-700">{s.label}</td>
                    <td className="px-2 py-1.5">
                      <select
                        value={data.coverage[s.key] ?? ""}
                        onChange={(e) =>
                          patch("coverage", {
                            ...data.coverage,
                            [s.key]: e.target.value,
                          })
                        }
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                      >
                        <option value="">— not assessed —</option>
                        <option value="Yes">Yes — covered</option>
                        <option value="Partial">Partial</option>
                        <option value="Recommended">Recommended (upsell)</option>
                        <option value="No">No</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>
      </div>

      {error ? (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? "Deleting…" : "Delete site"}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {busy ? "Saving…" : "Save site"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={"block " + (wide ? "sm:col-span-2" : "")}>
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function SectionLegend({
  icon: Icon,
  label,
}: {
  icon: typeof User;
  label: string;
}) {
  return (
    <legend className="-ml-1 mb-2 inline-flex items-center gap-2 px-2 text-base font-bold tracking-tight text-slate-900">
      <Icon className="h-5 w-5 text-brand-600" />
      {label}
    </legend>
  );
}

function SubsectionLegend({
  icon: Icon,
  label,
}: {
  icon: typeof User;
  label: string;
}) {
  return (
    <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
      <Icon className="h-4 w-4 text-slate-500" />
      {label}
    </div>
  );
}

function DiscoveredDevicesTable({ devices }: { devices: DiscoveredDevice[] }) {
  if (devices.length === 0) {
    return (
      <p className="mt-3 rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
        No hosts found in capture. Was the capture taken on the LAN side of the
        router?
      </p>
    );
  }
  // Per-category counts for the summary row
  const counts = devices.reduce<Record<string, number>>((acc, d) => {
    acc[d.classification] = (acc[d.classification] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(CATEGORY_LABEL) as DeviceCategory[])
          .filter((k) => counts[k])
          .map((k) => (
            <span
              key={k}
              className={
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 " +
                CATEGORY_BADGE[k]
              }
            >
              {CATEGORY_LABEL[k]} · {counts[k]}
            </span>
          ))}
      </div>
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">Category</th>
              <th className="px-2 py-1.5 text-left font-medium">IP</th>
              <th className="px-2 py-1.5 text-left font-medium">MAC</th>
              <th className="px-2 py-1.5 text-left font-medium">Vendor</th>
              <th className="px-2 py-1.5 text-left font-medium">Hostname / Kind</th>
              <th className="px-2 py-1.5 text-left font-medium">Evidence</th>
              <th className="px-2 py-1.5 text-left font-medium">Why</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {devices.map((d) => {
              const ev = d.evidence;
              const evParts: string[] = [];
              if (ev.dhcpVendorClass) evParts.push(`dhcp: ${ev.dhcpVendorClass}`);
              if (ev.mdnsServices && ev.mdnsServices.length)
                evParts.push(`mdns: ${ev.mdnsServices.slice(0, 2).join(", ")}`);
              if (ev.tlsSnis && ev.tlsSnis.length)
                evParts.push(`sni: ${ev.tlsSnis.slice(0, 2).join(", ")}`);
              if (ev.httpUserAgents && ev.httpUserAgents.length)
                evParts.push(`ua: ${ev.httpUserAgents[0].slice(0, 40)}`);
              if (ev.topPorts && ev.topPorts.length)
                evParts.push(`ports: ${ev.topPorts.slice(0, 4).join(",")}`);
              return (
                <tr key={d.mac} className="align-top">
                  <td className="px-2 py-1.5">
                    <span
                      className={
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 " +
                        CATEGORY_BADGE[d.classification]
                      }
                      title={`source: ${d.classificationSource} · confidence: ${d.confidence}`}
                    >
                      {CATEGORY_LABEL[d.classification]}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 font-mono">{d.ip || "—"}</td>
                  <td className="px-2 py-1.5 font-mono text-[10px] text-slate-500">
                    {d.mac}
                  </td>
                  <td className="px-2 py-1.5">{d.vendor || "—"}</td>
                  <td className="px-2 py-1.5">
                    <div>{d.hostname || "—"}</div>
                    {d.guessedKind ? (
                      <div className="text-[10px] text-slate-500">
                        {d.guessedKind}
                      </div>
                    ) : null}
                  </td>
                  <td className="max-w-[18rem] px-2 py-1.5 text-[10px] text-slate-500">
                    {evParts.length ? evParts.join(" · ") : "—"}
                  </td>
                  <td className="max-w-[18rem] px-2 py-1.5 text-[10px] text-slate-600">
                    {d.rationale || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PingBadge({
  probe,
}: {
  probe: { ip: string; reachable: boolean; latencyMs?: number } | null;
}) {
  if (!probe) {
    return (
      <span className="text-[10px] uppercase tracking-wide text-slate-400">
        not configured
      </span>
    );
  }
  const cls = probe.reachable
    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
    : "bg-rose-100 text-rose-700 ring-rose-200";
  const dot = probe.reachable ? "bg-emerald-500" : "bg-rose-500";
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 " +
        cls
      }
      title={probe.ip}
    >
      <span className={"h-1.5 w-1.5 rounded-full " + dot} />
      {probe.reachable
        ? `Online${probe.latencyMs != null ? ` ${probe.latencyMs.toFixed(0)}ms` : ""}`
        : "Offline"}
    </span>
  );
}

function CarbonSearchModal({
  siteAddress,
  onClose,
  onPick,
}: {
  siteAddress: string;
  onClose: () => void;
  onPick: (svc: CarbonServiceOption) => void;
}) {
  const [query, setQuery] = useState(siteAddress || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<CarbonServiceOption[]>([]);
  const [searched, setSearched] = useState(false);

  async function run() {
    const q = query.trim();
    if (!q) {
      setErr("Enter an address to search");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(
        `/api/admin/carbon/search?address=${encodeURIComponent(q)}`,
      );
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Search failed");
        setResults([]);
      } else {
        const items = (j.services || j.results || []) as CarbonServiceOption[];
        setResults(items);
      }
      setSearched(true);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Search ABB Carbon services
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void run();
                }
              }}
              placeholder="Address, suburb, or street"
              className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={run}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {busy ? "Searching…" : "Search"}
            </button>
          </div>
          {err ? (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {err}
            </div>
          ) : null}
          <div className="max-h-[55vh] overflow-y-auto">
            {results.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                {searched && !busy
                  ? "No services found. Try a broader address (suburb / street only)."
                  : "Enter an address and press Search to see Carbon services."}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {results.map((svc) => (
                  <li
                    key={svc.id}
                    className="flex items-start justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="font-mono text-xs text-slate-500">
                          #{svc.id}
                        </span>
                        {svc.alias ? (
                          <span className="font-semibold text-slate-900">
                            {svc.alias}
                          </span>
                        ) : null}
                        {svc.status ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-600">
                            {svc.status}
                          </span>
                        ) : null}
                      </div>
                      {svc.address ? (
                        <div className="mt-0.5 text-xs text-slate-700">
                          {svc.address}
                        </div>
                      ) : null}
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {svc.service_identifier ? (
                          <>
                            <span className="font-mono">
                              {svc.service_identifier}
                            </span>
                            {" · "}
                          </>
                        ) : null}
                        {svc.poi_name ? `POI: ${svc.poi_name}` : "POI: —"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPick(svc)}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      <Link2 className="h-3.5 w-3.5" /> Link this
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
