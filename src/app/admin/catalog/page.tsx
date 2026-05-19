import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { catalog } from "@/lib/store-catalog";
import { CatalogClient } from "./CatalogClient";

export default async function CatalogPage() {
  const me = await getCurrentUser();
  if (!me?.isAdmin) redirect("/login?next=/admin/catalog");
  return (
    <div className="space-y-4">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Admin home
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Store Catalog</h1>
        <p className="text-sm text-slate-500">
          Items customers can browse + order from <code>/portal/store</code>.
          Toggle <span className="font-medium">Active</span> off to hide an item
          without deleting it.
        </p>
      </div>
      <CatalogClient initial={catalog.slice()} />
    </div>
  );
}
