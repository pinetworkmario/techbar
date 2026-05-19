import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import { pingHost } from "@/lib/ping";

/** Combined live status for service modules that have a pingable on-prem
 * IP (CCTV camera, alarm panel, POS terminal/gateway). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ siteId: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { siteId } = await ctx.params;
  const site = sites.find((s) => s.id === siteId);
  if (!site)
    return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const cameraIp = site.cctvModule?.cameraIp;
  const alarmIp = site.cctvModule?.alarmIp;
  const terminalIp = site.posModule?.terminalIp;

  const [camera, alarm, posTerminal] = await Promise.all([
    cameraIp ? pingHost(cameraIp) : Promise.resolve(null),
    alarmIp ? pingHost(alarmIp) : Promise.resolve(null),
    terminalIp ? pingHost(terminalIp) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    ok: true,
    camera: cameraIp ? { ip: cameraIp, ...camera } : null,
    alarm: alarmIp ? { ip: alarmIp, ...alarm } : null,
    posTerminal: terminalIp ? { ip: terminalIp, ...posTerminal } : null,
  });
}
