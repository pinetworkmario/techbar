import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sites } from "@/lib/data";
import { findCustomerByName, listAgentsForCustomer } from "@/lib/atera";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ siteId: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { siteId } = await ctx.params;
  const site = sites.find((s) => s.id === siteId);
  if (!site)
    return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const customerName =
    typeof body.ateraCustomerName === "string"
      ? body.ateraCustomerName
      : site.endpointModule?.ateraCustomerName ?? "";

  if (!customerName.trim()) {
    return NextResponse.json(
      { error: "Atera customer name required" },
      { status: 400 },
    );
  }

  try {
    const cust = await findCustomerByName(customerName);
    if (!cust) {
      return NextResponse.json(
        {
          error: `No Atera customer matching "${customerName}". Verify the name in Atera → Customers.`,
        },
        { status: 404 },
      );
    }

    const agents = await listAgentsForCustomer(cust.CustomerID);
    const online = agents.filter((a) => a.Online).length;
    const offline = agents.length - online;

    return NextResponse.json({
      ok: true,
      message: `Linked to Atera customer "${cust.CustomerName}" (#${cust.CustomerID}) — ${agents.length} endpoints (${online} online, ${offline} offline)`,
      customer: {
        id: cust.CustomerID,
        name: cust.CustomerName,
      },
      agents: agents.map((a) => ({
        machineName: a.MachineName,
        agentName: a.AgentName,
        online: a.Online,
        os: a.OS,
        ips: a.IpAddresses,
        lastUser: a.LastLoginUser,
        lastReboot: a.LastRebootTime,
        version: a.AgentVersion,
      })),
      counts: { total: agents.length, online, offline },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Atera sync failed", detail: String(e) },
      { status: 502 },
    );
  }
}
