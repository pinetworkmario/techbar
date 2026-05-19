"use client";

import { useState, type ReactNode } from "react";
import {
  Calendar,
  Camera,
  CreditCard,
  Hammer,
  Info,
  MapPin,
  Monitor,
  Network as NetworkIcon,
  Phone,
  PlusCircle,
  ShieldCheck,
  StickyNote,
  Wifi,
} from "lucide-react";
import { CreateTicketModal } from "@/components/portal/CreateTicketModal";

interface DeviceDetailProps {
  siteId: string;
  siteName: string;
  device: {
    id: string;
    name: string;
    type: string;
    category: string;
    location: string;
    brand: string;
    model: string;
    serialNumber: string;
    status: string;
    lifecycleStage: string;
    warrantyExpiry: string;
    lastMaintenance?: string;
    nextMaintenance?: string;
    serviceCoverage: string[];
    assetNumber: string;
    photoUrl: string;
    hasUploadedPhoto: boolean;
    notes: string;
    gallery: string[];
  };
  backLink: ReactNode;
}

const CATEGORY_ICON: Record<string, typeof Wifi> = {
  network: NetworkIcon,
  voice: Phone,
  cctv: Camera,
  pos: CreditCard,
  endpoint: Monitor,
  it_support: ShieldCheck,
  projects: Hammer,
};

const STATUS_TONE: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  Warning: "bg-amber-100 text-amber-800 ring-amber-200",
  Offline: "bg-rose-100 text-rose-800 ring-rose-200",
  "In Support": "bg-sky-100 text-sky-800 ring-sky-200",
  "Not Monitored": "bg-slate-100 text-slate-700 ring-slate-200",
};

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

export function DeviceDetailClient({
  siteId,
  siteName,
  device,
  backLink,
}: DeviceDetailProps) {
  const [ticketLabel, setTicketLabel] = useState<string | null>(null);
  const allPhotos = [device.photoUrl, ...device.gallery];
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const Icon = CATEGORY_ICON[device.category] ?? Info;
  const label = `${device.name} (${device.assetNumber})`;
  const tone = STATUS_TONE[device.status] ?? STATUS_TONE["Not Monitored"];

  return (
    <div className="space-y-5">
      {backLink}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-brand-600" />
            <h1 className="text-2xl font-semibold text-slate-900">
              {device.name}
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            {device.type} · {device.brand} {device.model} · at {siteName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 " +
              tone
            }
          >
            {device.status}
          </span>
          <button
            type="button"
            onClick={() => setTicketLabel(label)}
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            <PlusCircle className="h-4 w-4" /> Create Ticket
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={allPhotos[activePhoto]}
            alt={`${device.name} location photo`}
            onClick={() => setLightbox(true)}
            className="aspect-[4/3] w-full cursor-zoom-in object-cover"
          />
          {allPhotos.length > 1 ? (
            <div className="flex gap-1.5 overflow-x-auto bg-slate-50 px-2 py-2">
              {allPhotos.map((url, i) => (
                <button
                  key={url + i}
                  type="button"
                  onClick={() => setActivePhoto(i)}
                  className={
                    "h-12 w-16 shrink-0 overflow-hidden rounded border-2 transition " +
                    (i === activePhoto
                      ? "border-brand-600"
                      : "border-transparent opacity-70 hover:opacity-100")
                  }
                  aria-label={`Photo ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1 text-slate-600">
              <MapPin className="h-3.5 w-3.5" /> {device.location || "Location not recorded"}
            </span>
            <span
              className={
                "rounded px-1.5 py-0.5 font-medium text-white " +
                (device.hasUploadedPhoto || device.gallery.length > 0
                  ? "bg-emerald-600"
                  : "bg-slate-500")
              }
            >
              {device.hasUploadedPhoto || device.gallery.length > 0
                ? `On-site photo${allPhotos.length > 1 ? ` · ${allPhotos.length}` : ""}`
                : "Stock placeholder"}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {device.notes ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                <StickyNote className="h-4 w-4" />
                Notes
              </div>
              <p className="whitespace-pre-wrap text-sm text-amber-900/90">
                {device.notes}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
              No on-site notes for this device. Ask PI Network to add notes if
              you'd like extra context here.
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Info className="h-4 w-4 text-brand-600" />
              Specifications
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <Spec label="Asset number" value={device.assetNumber} mono />
              <Spec label="Serial number" value={device.serialNumber || "—"} mono />
              <Spec label="Type" value={device.type} />
              <Spec label="Brand / Model" value={`${device.brand} ${device.model}`} />
              <Spec label="Lifecycle" value={device.lifecycleStage} />
              <Spec label="Warranty expires" value={fmtDate(device.warrantyExpiry)} />
              <Spec label="Last maintenance" value={fmtDate(device.lastMaintenance)} />
              <Spec label="Next maintenance" value={fmtDate(device.nextMaintenance)} />
            </dl>
          </div>

          {device.serviceCoverage.length > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-brand-600" />
                Service coverage
              </div>
              <div className="flex flex-wrap gap-1.5">
                {device.serviceCoverage.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Calendar className="h-4 w-4 text-brand-600" />
              Live data
            </div>
            <p className="text-xs text-slate-500">
              Live telemetry (uptime, last-seen, IP, firmware) is sourced from
              the vendor management plane (Ruijie / UniFi / Atera) and shown
              when available. If a signal you need isn't here, raise a ticket
              and we'll wire it in.
            </p>
          </div>
        </div>
      </div>

      <CreateTicketModal
        open={ticketLabel !== null}
        onClose={() => setTicketLabel(null)}
        defaultSiteId={siteId}
        defaultDevice={ticketLabel ?? undefined}
      />

      {lightbox ? (
        <div
          onClick={() => setLightbox(false)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={allPhotos[activePhoto]}
            alt={`${device.name} location photo (full size)`}
            className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
          />
        </div>
      ) : null}
    </div>
  );
}

function Spec({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={
          "text-slate-900 " + (mono ? "font-mono text-[11px]" : "")
        }
      >
        {value}
      </dd>
    </>
  );
}
