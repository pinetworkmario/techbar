"use client";

import { useState } from "react";
import { Check, Copy, Mail, Send } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { currency, formatDate } from "@/lib/utils";

export interface ReferralPanelData {
  code: string;
  link: string;
  credit: {
    available: number;
    pending: number;
    used: number;
    nextInvoiceCredit: number;
  };
  activity: {
    id: string;
    referredBusiness: string;
    status: "Invited" | "Contacted" | "Purchased" | "Credit Applied";
    eligibleService: string;
    creditAmount: number;
    date: string;
  }[];
}

export function ReferralPanel({ data }: { data: ReferralPanelData }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  if (!data.code) return null;

  function copy(text: string, what: "code" | "link") {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  }

  const { code, link, credit, activity } = data;
  const hasActivity = activity.length > 0;
  const hasNextCredit = credit.nextInvoiceCredit > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Referral Program"
          subtitle="Refer another business to PI Network. When a referred business purchases eligible PI Network services, both businesses receive discount credits on their account."
        />
        <CardBody className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Your referral code
              </div>
              <div className="mt-1 flex items-center gap-2">
                <code className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800 ring-1 ring-inset ring-slate-200">
                  {code}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copy(code, "code")}
                >
                  {copied === "code" ? (
                    <>
                      <Check className="h-4 w-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy code
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Referral link
              </div>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
                  {link}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copy(link, "link")}
                >
                  {copied === "link" ? (
                    <>
                      <Check className="h-4 w-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy link
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="secondary">
                <Mail className="h-4 w-4" /> Share by email
              </Button>
              <Button variant="ghost">
                <Send className="h-4 w-4" /> Share on Slack / Teams
              </Button>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              Credits are applied to eligible PI Network invoices and are not
              paid out as cash.
            </div>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Credit summary
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <CreditTile label="Available credit" value={credit.available} />
              <CreditTile label="Pending credit" value={credit.pending} />
              <CreditTile label="Used credit" value={credit.used} />
              <CreditTile
                label="Next invoice credit"
                value={credit.nextInvoiceCredit}
                highlight
              />
            </div>
            {hasNextCredit ? (
              <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50 p-3 text-xs text-brand-900">
                Your next PI Network invoice will be reduced by{" "}
                <strong>{currency(credit.nextInvoiceCredit)}</strong> in
                referral credit.
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {hasActivity ? (
        <Card>
          <CardHeader title="Referral activity" />
          <CardBody className="overflow-x-auto p-0">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Referred business</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Eligible service</th>
                  <th className="px-5 py-3">Credit</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activity.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {a.referredBusiness}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        tone={
                          a.status === "Credit Applied"
                            ? "success"
                            : a.status === "Purchased"
                              ? "brand"
                              : a.status === "Contacted"
                                ? "info"
                                : "muted"
                        }
                      >
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {a.eligibleService}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {a.creditAmount > 0 ? currency(a.creditAmount) : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(a.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function CreditTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg p-3 ring-1 ring-inset " +
        (highlight
          ? "bg-brand-50 text-brand-900 ring-brand-100"
          : "bg-white text-slate-900 ring-slate-200")
      }
    >
      <div
        className={
          "text-xs " + (highlight ? "text-brand-700" : "text-slate-500")
        }
      >
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{currency(value)}</div>
    </div>
  );
}
