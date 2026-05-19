import Link from "next/link";
import { Building2, UserPlus } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReferralPanel } from "@/components/portal/ReferralPanel";
import { PaymentMethodsCard } from "./PaymentMethodsCard";
import { sites } from "@/lib/data";
import { allowedSiteIds, getCurrentUser } from "@/lib/auth";
import { SUPPORT_PACKS, getSupportPack } from "@/lib/support-packs";
import type { SupportPack } from "@/lib/types";

const PACK_ORDER: SupportPack[] = [
  "no_support",
  "isp_only",
  "essential",
  "protection",
  "enterprise_protection",
];

export default async function AccountPage() {
  const me = await getCurrentUser();
  const userId = me?.id ?? "anon";
  const allowed = me
    ? new Set(
        allowedSiteIds(
          me,
          sites.map((s) => s.id),
        ),
      )
    : new Set<string>();
  const visibleSites = sites.filter((s) => allowed.has(s.id));

  // Per-user derived referral identity (placeholder — production stores per
  // customer and tracks real activity).
  const refSlug = userId.replace(/^u-/, "").slice(0, 8).toUpperCase();
  const referral = {
    code: `PI-REF-${refSlug}`,
    link: `https://pinetwork.com.au/ref/PI-REF-${refSlug}`,
    credit: { available: 0, pending: 0, used: 0, nextInvoiceCredit: 0 },
    activity: [],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Account"
        description="Profile, support plans, payment methods, contacts and the referral program."
      />

      <SupportPlansAtMySites sites={visibleSites} />

      <SupportPlanCompareCard />

      {me && !me.parentUserId ? (
        <Link
          href="/portal/account/contacts"
          className="group flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50/40 p-4 transition hover:border-brand-300 hover:bg-brand-50"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-white">
            <UserPlus className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900 group-hover:text-brand-800">
              Manage contacts
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              Invite teammates and grant them access to a subset of the sites
              and modules you have. Contacts cannot create further accounts.
            </p>
          </div>
          <span className="text-sm font-medium text-brand-600 group-hover:text-brand-700">
            Open →
          </span>
        </Link>
      ) : null}

      <PaymentMethodsCard />

      <ReferralPanel data={referral} />
    </div>
  );
}

function SupportPlansAtMySites({
  sites,
}: {
  sites: { id: string; name: string; supportPack?: SupportPack }[];
}) {
  if (sites.length === 0) return null;
  return (
    <Card>
      <CardHeader
        title="Support plans across your sites"
        subtitle="Each site can be on a different support plan. Click a site to see its plan and SLA in detail."
      />
      <CardBody className="overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Site</th>
              <th className="px-5 py-3">Support plan</th>
              <th className="px-5 py-3">Service Level Agreement</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sites.map((s) => {
              const pack = getSupportPack(s.supportPack);
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      {s.name}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <PackBadge tone={pack.tone}>{pack.name}</PackBadge>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-600">
                    {pack.sla}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/portal/sites/${s.id}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Open site →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

function SupportPlanCompareCard() {
  return (
    <Card>
      <CardHeader
        title="Support plan options"
        subtitle="The four service tiers PI Network offers. Each site is enrolled in one plan; speak to your account manager to change a site's plan."
      />
      <CardBody>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PACK_ORDER.map((key) => {
            const pack = SUPPORT_PACKS[key];
            return (
              <div
                key={key}
                className={
                  "flex flex-col rounded-lg border p-4 " +
                  packBorderClass(pack.tone)
                }
              >
                <PackBadge tone={pack.tone}>{pack.name}</PackBadge>
                <p className="mt-2 text-xs text-slate-700">{pack.blurb}</p>
                <div className="mt-3 space-y-2 text-xs">
                  <div>
                    <div className="font-medium uppercase tracking-wider text-slate-500">
                      Service Level Agreement
                    </div>
                    <div className="mt-0.5 text-slate-700">{pack.sla}</div>
                  </div>
                  <div>
                    <div className="font-medium uppercase tracking-wider text-slate-500">
                      Coverage
                    </div>
                    <div className="mt-0.5 text-slate-700">{pack.scope}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] text-slate-500">
          Pricing, onsite labour rates and material charges differ between
          plans and are detailed in your service agreement.
        </p>
      </CardBody>
    </Card>
  );
}

function PackBadge({
  tone,
  children,
}: {
  tone: "brand" | "success" | "warning" | "neutral";
  children: React.ReactNode;
}) {
  const cls: Record<typeof tone, string> = {
    brand: "bg-brand-50 text-brand-700 ring-brand-200",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <span
      className={
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset " +
        cls[tone]
      }
    >
      {children}
    </span>
  );
}

function packBorderClass(
  tone: "brand" | "success" | "warning" | "neutral",
): string {
  return {
    brand: "border-brand-100 bg-brand-50/30",
    success: "border-emerald-100 bg-emerald-50/30",
    warning: "border-amber-100 bg-amber-50/30",
    neutral: "border-slate-200 bg-white",
  }[tone];
}
