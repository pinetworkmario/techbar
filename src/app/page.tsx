import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/**
 * Root entry. Hitting the bare hostname (e.g. https://customerportal/) now
 * skips the legacy marketing landing page and drops the user into the
 * portal directly:
 *   - signed-in admin     → /admin
 *   - signed-in customer  → /portal/sites
 *   - not signed in       → /login
 *
 * Marketing copy isn't customer-facing for the internal-only deployment.
 */
export default async function Root() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.isAdmin) redirect("/admin");
  redirect("/portal/sites");
}
