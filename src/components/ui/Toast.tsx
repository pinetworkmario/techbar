"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "info" | "success" | "error";

type Toast = {
  id: number;
  msg: string;
  kind: ToastKind;
  visible: boolean;
};

type ToastContextValue = {
  showToast: (msg: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {
        // no-op outside provider
      },
    };
  }
  return ctx;
}

const TONE: Record<ToastKind, { bg: string; ring: string; icon: ReactNode }> = {
  info: {
    bg: "bg-white text-slate-900",
    ring: "ring-slate-200",
    icon: <Info className="h-5 w-5 text-brand-600" />,
  },
  success: {
    bg: "bg-white text-slate-900",
    ring: "ring-emerald-200",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  },
  error: {
    bg: "bg-white text-slate-900",
    ring: "ring-rose-200",
    icon: <AlertTriangle className="h-5 w-5 text-rose-600" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: false } : t)),
    );
    // remove from DOM after fade-out
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const showToast = useCallback(
    (msg: string, kind: ToastKind = "info") => {
      counterRef.current += 1;
      const id = counterRef.current;
      setToasts((prev) => [...prev, { id, msg, kind, visible: false }]);
      // slide-in next frame
      window.requestAnimationFrame(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, visible: true } : t)),
        );
      });
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  // ensure mounted before portaling to avoid SSR mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => {
        const tone = TONE[t.kind];
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl p-3 pr-2 shadow-soft ring-1 transition-all duration-200",
              tone.bg,
              tone.ring,
              t.visible
                ? "translate-x-0 opacity-100"
                : "translate-x-4 opacity-0",
            )}
            role="status"
          >
            <div className="mt-0.5 shrink-0">{tone.icon}</div>
            <div className="flex-1 text-sm leading-snug">{t.msg}</div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
