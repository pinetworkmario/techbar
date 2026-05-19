import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { allowedSiteIds, getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import { catalog } from "@/lib/store-catalog";
import { ProductDetailClient } from "./ProductDetailClient";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const me = await getCurrentUser();
  if (!me) redirect(`/login?next=/portal/store/${itemId}`);
  const item = catalog.find((c) => c.id === itemId && c.active !== false);
  if (!item) notFound();
  const allowed = new Set(
    allowedSiteIds(
      me,
      sites.map((s) => s.id),
    ),
  );
  const visibleSites = sites
    .filter((s) => allowed.has(s.id))
    .map((s) => ({ id: s.id, name: s.name }));
  return (
    <div className="space-y-4">
      <Link
        href="/portal/store"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Store
      </Link>
      <ProductDetailClient item={item} sites={visibleSites} />
    </div>
  );
}
