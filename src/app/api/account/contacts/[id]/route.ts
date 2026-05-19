import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listInvites,
  listUsers,
  saveInvites,
  saveUsers,
  type ServiceCategoryKey,
  type User,
} from "@/lib/store";

function isSubsetOfParent(
  child: Record<string, ServiceCategoryKey[]>,
  parent: User,
): boolean {
  if (parent.isAdmin) return true;
  for (const [siteId, mods] of Object.entries(child)) {
    const parentMods = parent.permissions[siteId];
    if (!parentMods) return false;
    for (const m of mods) {
      if (!parentMods.includes(m)) return false;
    }
  }
  return true;
}

async function loadOwned(meId: string, contactId: string) {
  const users = await listUsers();
  const target = users.find((u) => u.id === contactId);
  if (!target || target.parentUserId !== meId) return { users, target: null };
  return { users, target };
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (me.parentUserId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json();
  const { users, target } = await loadOwned(me.id, id);
  if (!target)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (typeof body.name === "string") target.name = body.name.trim();
  if (typeof body.role === "string") target.role = body.role.trim();
  if (typeof body.disabled === "boolean") target.disabled = body.disabled;
  if (body.permissions && typeof body.permissions === "object") {
    const next = body.permissions as Record<string, ServiceCategoryKey[]>;
    if (!isSubsetOfParent(next, me)) {
      return NextResponse.json(
        {
          error:
            "Cannot grant permissions beyond your own access scope.",
        },
        { status: 400 },
      );
    }
    target.permissions = next;
  }
  target.updatedAt = new Date().toISOString();
  await saveUsers(users);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (me.parentUserId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const { users, target } = await loadOwned(me.id, id);
  if (!target)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  await saveUsers(users.filter((u) => u.id !== id));
  const invites = await listInvites();
  await saveInvites(invites.filter((i) => i.userId !== id));
  return NextResponse.json({ ok: true });
}
