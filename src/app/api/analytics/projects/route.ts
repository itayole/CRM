import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Project / billing analytics — the research-firm view (revenue by client,
// methodology, account manager, research type, and status breakdown). Read-only.
// RBAC mirrors /api/projects: admins see all, reps see their own.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "admin";
  const userId = Number(session.user.id);
  const where = isAdmin ? {} : { assigneeId: userId };

  const [totals, withBilling, byMethodologyRaw, byManagerRaw, byClientRaw, byStatusRaw, byResearchTypeRaw, users] =
    await Promise.all([
      prisma.project.aggregate({ where, _count: { _all: true }, _sum: { billing: true } }),
      prisma.project.count({ where: { ...where, billing: { gt: 0 } } }),
      prisma.project.groupBy({ by: ["methodology"], where, _count: { _all: true }, _sum: { billing: true } }),
      prisma.project.groupBy({ by: ["assigneeId"], where, _count: { _all: true }, _sum: { billing: true } }),
      prisma.project.groupBy({ by: ["clientId"], where: { ...where, clientId: { not: null } }, _count: { _all: true }, _sum: { billing: true }, orderBy: { _sum: { billing: "desc" } }, take: 8 }),
      prisma.project.groupBy({ by: ["statusText"], where, _count: { _all: true } }),
      prisma.project.groupBy({ by: ["researchTypeId"], where: { ...where, researchTypeId: { not: null } }, _count: { _all: true }, _sum: { billing: true } }),
      prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
    ]);

  const userMap = new Map(users.map(u => [u.id, u.name]));
  const num = (v: unknown) => Number(v ?? 0);

  // Resolve top-client and research-type names.
  const clientIds = byClientRaw.map(g => g.clientId!).filter(Boolean);
  const rtIds = byResearchTypeRaw.map(g => g.researchTypeId!).filter(Boolean);
  const [clients, researchTypes] = await Promise.all([
    clientIds.length ? prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    rtIds.length ? prisma.researchType.findMany({ where: { id: { in: rtIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);
  const clientMap = new Map(clients.map(c => [c.id, c.name]));
  const rtMap = new Map(researchTypes.map(r => [r.id, r.name]));

  const totalBilling = num(totals._sum.billing);
  const totalProjects = totals._count._all;

  const sortByBilling = <T extends { billing: number }>(arr: T[]) => arr.sort((a, b) => b.billing - a.billing);

  return NextResponse.json({
    kpis: {
      totalProjects,
      totalBilling,
      withBilling,
      avgBilling: withBilling ? Math.round(totalBilling / withBilling) : 0,
    },
    byMethodology: sortByBilling(byMethodologyRaw.map(g => ({ name: g.methodology ?? "ללא", count: g._count._all, billing: num(g._sum.billing) }))).slice(0, 8),
    byManager: sortByBilling(byManagerRaw.map(g => ({ name: g.assigneeId ? (userMap.get(g.assigneeId) ?? `#${g.assigneeId}`) : "לא משויך", count: g._count._all, billing: num(g._sum.billing) }))).slice(0, 8),
    byClient: byClientRaw.map(g => ({ name: clientMap.get(g.clientId!) ?? `#${g.clientId}`, count: g._count._all, billing: num(g._sum.billing) })),
    byStatus: byStatusRaw.map(g => ({ name: g.statusText ?? "ללא סטטוס", count: g._count._all })).sort((a, b) => b.count - a.count).slice(0, 10),
    byResearchType: sortByBilling(byResearchTypeRaw.map(g => ({ name: rtMap.get(g.researchTypeId!) ?? `#${g.researchTypeId}`, count: g._count._all, billing: num(g._sum.billing) }))).slice(0, 8),
  });
}
