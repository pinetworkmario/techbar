import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, getCurrentUser } from "@/lib/auth";
import { allowedSiteIds } from "@/lib/auth";
import { sites } from "@/lib/data";
import "@/lib/server-data";
import { OnsitePinClient } from "./OnsitePinClient";

export const metadata = {
  title: "PI Network · Onsite",
};

export default async function OnsitePage() {
  // If already signed in, jump straight to site picker (or single site).
  const me = await getCurrentUser();
  if (me) {
    const allowed = allowedSiteIds(me, sites.map((s) => s.id));
    if (allowed.length === 1) redirect(`/onsite/site/${allowed[0]}`);
    if (allowed.length > 1) redirect("/onsite/site");
  }
  return <OnsitePinClient />;
}
