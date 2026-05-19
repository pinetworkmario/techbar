import { Card } from "./Card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "neutral" | "brand" | "warning" | "danger" | "success";
}) {
  const accent = {
    neutral: "text-slate-500",
    brand: "text-brand-600",
    warning: "text-amber-600",
    danger: "text-rose-600",
    success: "text-emerald-600",
  }[tone];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {value}
          </div>
          {hint ? (
            <div className={cn("mt-1 text-xs", accent)}>{hint}</div>
          ) : null}
        </div>
        {icon ? (
          <div
            className={cn(
              "grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-500",
              tone === "brand" && "bg-brand-50 text-brand-600",
              tone === "warning" && "bg-amber-50 text-amber-600",
              tone === "danger" && "bg-rose-50 text-rose-600",
              tone === "success" && "bg-emerald-50 text-emerald-600",
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
