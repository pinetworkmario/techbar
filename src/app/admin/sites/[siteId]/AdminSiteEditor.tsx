"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ImagePlus,
  ImageUp,
  Images,
  Pencil,
  Plus,
  Save,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { DeviceFormModal, type DeviceDraft } from "./DeviceFormModal";

export interface AdminDeviceRow {
  id: string;
  name: string;
  type: string;
  location: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: string;
  lifecycleStage: string;
  warrantyExpiry: string;
  serviceCoverage: string[];
  assetNumber: string;
  photoUrl: string;
  hasUploadedPhoto: boolean;
  notes: string;
  gallery: string[];
}

const EMPTY_DEVICE: DeviceDraft = {
  name: "",
  type: "Router",
  location: "",
  brand: "",
  model: "",
  serialNumber: "",
  status: "Active",
  lifecycleStage: "In Service",
  warrantyExpiry: new Date().toISOString().slice(0, 10),
  serviceCoverage: [],
  assetNumber: "",
};

export function AdminSiteEditor({
  siteId,
  devices,
}: {
  siteId: string;
  devices: AdminDeviceRow[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  function rowToDraft(d: AdminDeviceRow): DeviceDraft {
    return {
      id: d.id,
      name: d.name,
      type: d.type,
      location: d.location,
      brand: d.brand,
      model: d.model,
      serialNumber: d.serialNumber,
      status: d.status,
      lifecycleStage: d.lifecycleStage,
      warrantyExpiry: d.warrantyExpiry,
      serviceCoverage: d.serviceCoverage,
      assetNumber: d.assetNumber,
    };
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          Devices ({devices.length})
        </h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Add device
        </button>
      </div>

      {error ? (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {devices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No devices recorded yet at this site.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-1 divide-y divide-slate-100">
            {devices.map((d) => (
              <DeviceRow
                key={d.id}
                device={d}
                siteId={siteId}
                onError={setError}
                onEdit={() => setEditingId(d.id)}
              />
            ))}
          </div>
        </div>
      )}

      {adding ? (
        <DeviceFormModal
          siteId={siteId}
          initial={EMPTY_DEVICE}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      ) : null}

      {editingId
        ? (() => {
            const d = devices.find((x) => x.id === editingId);
            if (!d) return null;
            return (
              <DeviceFormModal
                siteId={siteId}
                initial={rowToDraft(d)}
                onClose={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null);
                  router.refresh();
                }}
              />
            );
          })()
        : null}
    </div>
  );
}

function DeviceRow({
  device,
  siteId,
  onError,
  onEdit,
}: {
  device: AdminDeviceRow;
  siteId: string;
  onError: (msg: string | null) => void;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [notes, setNotes] = useState(device.notes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState<string | null>(null);
  const notesDirty = notes.trim() !== device.notes.trim();

  async function saveNotes() {
    setSavingNotes(true);
    try {
      const r = await fetch(`/api/admin/devices/${device.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        onError(j.error || "Save failed");
        return;
      }
      setNotesSavedAt(new Date().toLocaleTimeString());
      router.refresh();
    } finally {
      setSavingNotes(false);
    }
  }

  async function uploadPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch(`/api/admin/devices/${device.id}/photo`, {
        method: "POST",
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) {
        onError(j.error || "Upload failed");
        return;
      }
      router.refresh();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function deletePhoto() {
    if (!confirm("Remove the uploaded photo for this device?")) return;
    const r = await fetch(`/api/admin/devices/${device.id}/photo`, {
      method: "DELETE",
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      onError(j.error || "Delete failed");
      return;
    }
    router.refresh();
  }

  async function uploadGalleryPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onError(null);
    setGalleryUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch(`/api/admin/devices/${device.id}/gallery`, {
        method: "POST",
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) {
        onError(j.error || "Upload failed");
        return;
      }
      router.refresh();
    } finally {
      setGalleryUploading(false);
      e.target.value = "";
    }
  }

  async function removeGalleryPhoto(url: string) {
    if (!confirm("Remove this photo from the gallery?")) return;
    const r = await fetch(
      `/api/admin/devices/${device.id}/gallery?url=${encodeURIComponent(url)}`,
      { method: "DELETE" },
    );
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      onError(j.error || "Delete failed");
      return;
    }
    router.refresh();
  }

  async function deleteDevice() {
    if (!confirm(`Delete "${device.name}"? This cannot be undone.`)) return;
    const r = await fetch(`/api/admin/sites/${siteId}/devices/${device.id}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      onError(j.error || "Delete failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-4 p-4 sm:grid-cols-[160px_1fr] sm:items-start">
      <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-slate-200 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={device.photoUrl}
          alt={`${device.name} location`}
          className="h-full w-full object-cover"
        />
        <span
          className={
            "absolute left-1 top-1 rounded px-1 text-[10px] font-medium text-white " +
            (device.hasUploadedPhoto ? "bg-emerald-600/90" : "bg-slate-700/80")
          }
        >
          {device.hasUploadedPhoto ? "Custom" : "Default"}
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {device.name}
            </div>
            <div className="text-xs text-slate-500">
              {device.type} · {device.brand} {device.model} ·{" "}
              <span className="font-medium text-slate-700">
                {device.location || "—"}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Asset:{" "}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-800">
                {device.assetNumber}
              </span>{" "}
              · Serial: {device.serialNumber || "—"}
            </div>
            <div className="text-xs text-slate-500">
              Status: {device.status} · Lifecycle: {device.lifecycleStage} ·
              Warranty: {device.warrantyExpiry}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <label
            className={
              "inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium " +
              (uploading
                ? "cursor-wait bg-slate-100 text-slate-400"
                : "bg-brand-600 text-white hover:bg-brand-700")
            }
          >
            <ImageUp className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Upload photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={uploading}
              onChange={uploadPhoto}
            />
          </label>
          {device.hasUploadedPhoto ? (
            <button
              type="button"
              onClick={deletePhoto}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Remove photo
            </button>
          ) : null}
          <button
            type="button"
            onClick={deleteDevice}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete device
          </button>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
              <StickyNote className="h-3.5 w-3.5 text-amber-500" />
              Notes for customer (shown on device "More Details")
            </label>
            <div className="flex items-center gap-2">
              {notesSavedAt ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                  <Check className="h-3 w-3" /> Saved {notesSavedAt}
                </span>
              ) : null}
              <button
                type="button"
                onClick={saveNotes}
                disabled={savingNotes || !notesDirty}
                className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {savingNotes ? "Saving…" : "Save notes"}
              </button>
            </div>
          </div>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (notesSavedAt) setNotesSavedAt(null);
            }}
            placeholder='e.g. "Behind the front counter, under the receipt printer. Reset button on back."'
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
              <Images className="h-3.5 w-3.5 text-violet-500" />
              Additional location photos ({device.gallery.length}/8)
            </label>
            <label
              className={
                "inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium " +
                (galleryUploading || device.gallery.length >= 8
                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                  : "bg-violet-600 text-white hover:bg-violet-700")
              }
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {galleryUploading ? "Uploading…" : "Add photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={galleryUploading || device.gallery.length >= 8}
                onChange={uploadGalleryPhoto}
              />
            </label>
          </div>
          {device.gallery.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              No extra photos yet. Add wider/closer shots so customers can
              find this device.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {device.gallery.map((url) => (
                <div
                  key={url}
                  className="relative h-16 w-20 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="device location"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryPhoto(url)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-rose-600/90 p-0.5 text-white shadow hover:bg-rose-700"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
