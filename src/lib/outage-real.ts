import "server-only";
import { getCarbonOutageForService } from "./carbon-bridge";
import { getAccessTypeMeta } from "./access-network";
import type { OutageReport, Site } from "./types";

export async function realOutageCheckForSite(
  site: Site,
): Promise<OutageReport | null> {
  if (!site.carbonServiceId) return null;
  try {
    const r = await getCarbonOutageForService(site.carbonServiceId);
    const meta = getAccessTypeMeta(site.accessNetwork?.type);
    const source = `ABB Carbon (${site.accessNetwork?.carrier || "Aussie Broadband"})`;
    const now = new Date(r.checked_at * 1000);

    if (r.status === "outage") {
      const e = r.matches.current[0];
      return {
        status: "outage",
        checkedAt: now.toISOString(),
        source,
        message: e
          ? `${e.title} — affects POI ${r.poi}. ETA: ${e.eta || "TBD"}.`
          : `${meta.label}: outage reported affecting POI ${r.poi}.`,
        scheduledStartsAt: e?.start_date,
        scheduledEndsAt: e?.end_date,
      };
    }
    if (r.status === "scheduled") {
      const e = r.matches.future[0];
      return {
        status: "scheduled",
        checkedAt: now.toISOString(),
        source,
        message: e
          ? `${e.title} — scheduled maintenance affecting POI ${r.poi}.`
          : `Scheduled maintenance affecting POI ${r.poi}.`,
        scheduledStartsAt: e?.start_date,
        scheduledEndsAt: e?.end_date,
      };
    }
    return {
      status: "operational",
      checkedAt: now.toISOString(),
      source,
      message: r.poi
        ? `${meta.label}: no current incidents affecting POI ${r.poi}.`
        : `${meta.label}: no current incidents reported.`,
    };
  } catch (e) {
    console.warn("[outage-real] Carbon outage check failed:", e);
    return null;
  }
}
