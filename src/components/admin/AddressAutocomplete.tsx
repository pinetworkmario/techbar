"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

function genSessionToken(): string {
  // Lightweight UUID-ish token; Google only requires per-session uniqueness.
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  required,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const sessionToken = useRef<string>(genSessionToken());
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Suppresses the next fetch after the user picks a suggestion (so we
   * don't immediately re-search on the value we just set). */
  const suppressNextFetch = useRef(false);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (suppressNextFetch.current) {
      suppressNextFetch.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const q = value.trim();
    if (q.length < 3) {
      setPredictions([]);
      setOpen(false);
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/admin/places/autocomplete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            input: q,
            sessionToken: sessionToken.current,
          }),
        });
        const j = await r.json();
        if (!r.ok) {
          setError(j.error || "Lookup failed");
          setPredictions([]);
          setOpen(true);
          return;
        }
        setPredictions(j.predictions || []);
        setHighlight(0);
        setOpen((j.predictions || []).length > 0);
      } catch (e) {
        setError(String(e));
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [value]);

  function pick(p: Prediction) {
    suppressNextFetch.current = true;
    onChange(p.description);
    setOpen(false);
    setPredictions([]);
    sessionToken.current = genSessionToken(); // Google: rotate after a selection
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => predictions.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, predictions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter" && predictions[highlight]) {
              e.preventDefault();
              pick(predictions[highlight]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className={
            "w-full pr-8 " +
            (className ??
              "rounded-md border border-slate-200 px-3 py-2 text-sm")
          }
          autoComplete="off"
        />
        {loading ? (
          <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        ) : (
          <MapPin className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}
      </div>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {error ? (
            <div className="px-3 py-2 text-xs text-rose-700">{error}</div>
          ) : predictions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">
              No matches.
            </div>
          ) : (
            <ul>
              {predictions.map((p, i) => (
                <li key={p.placeId}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(p);
                    }}
                    onMouseEnter={() => setHighlight(i)}
                    className={
                      "block w-full px-3 py-1.5 text-left text-xs transition " +
                      (i === highlight
                        ? "bg-brand-50 text-brand-900"
                        : "hover:bg-slate-50 text-slate-700")
                    }
                  >
                    <div className="font-medium text-slate-900">
                      {p.mainText || p.description}
                    </div>
                    {p.secondaryText ? (
                      <div className="text-[11px] text-slate-500">
                        {p.secondaryText}
                      </div>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 bg-slate-50 px-3 py-1 text-[10px] text-slate-400">
            Powered by Google Places · biased to Australia
          </div>
        </div>
      ) : null}
    </div>
  );
}
