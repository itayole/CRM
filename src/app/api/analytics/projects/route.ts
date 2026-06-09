import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Project / billing analytics — the research-firm view. Read-only.
// RBAC mirrors /api/projects: admins see all, reps see their own.
//
// Status -> outcome mapping (confirmed with the business). NOTE: statuses are
// free-text from M-Files; if new ones appear they fall into "open" until added
// here. Candidate to move into the Settings config later.
const WON_STATUSES = ["בעבודה", "רק אושר"];
const LOST_STATUSES = ["לא קיבלנו"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "admin";
  const userId = Number(session.user.id);
  const base = isAdmin ? {} : { assigneeId: userId };
  const wonWhere = { ...base, statusText: { in: WON_STATUSES } };

  const num = (v: unknown) => Number(v ?? 0);

  const [total, won, lost, byStatusRaw, byMethodologyRaw, byManagerRaw, byClientRaw, byResearchTypeRaw, users] =
    await Promise.all([
      prisma.project.aggregate({ where: base, _count: { _all: true }, _sum: { billing: true } }),
      prisma.project.aggregate({ where: wonWhere, _count: { _all: true }, _sum: { billing: true } }),
      prisma.project.aggregate({ where: { ...base, statusText: { in: LOST_STATUSES } }, _count: { _all: true }, _sum: { billing: true } }),
      // Full status funnel (all projects).
      prisma.project.groupBy({ by: ["statusText"], where: base, _count: { _all: true }, _sum: { billing: true } }),
      // Revenue breakdowns reflect WON (realized) billing only.
      prisma.project.groupBy({ by: ["methodology"], where: wonWhere, _count: { _all: true }, _sum: { billing: true } }),
      prisma.project.groupBy({ by: ["assigneeId"], where: wonWhere, _count: { _all: true }, _sum: { billing: true } }),
      prisma.project.groupBy({ by: ["clientId"], where: { ...wonWhere, clientId: { not: null } }, _count: { _all: true }, _sum: { billing: true }, orderBy: { _sum: { billing: "desc" } }, take: 8 }),
      prisma.project.groupBy({ by: ["researchTypeId"], where: { ...wonWhere, researchTypeId: { not: null } }, _count: { _all: true }, _sum: { billing: true } }),
      prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
    ]);

  const userMap = new Map(users.map(u => [u.id, u.name]));
  const clientIds = byClientRaw.map(g => g.clientId!).filter(Boolean);
  const rtIds = byResearchTypeRaw.map(g => g.researchTypeId!).filter(Boolean);
  const [clients, researchTypes] = await Promise.all([
    clientIds.length ? prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    rtIds.length ? prisma.researchType.findMany({ where: { id: { in: rtIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);
  const clientMap = new Map(clients.map(c => [c.id, c.name]));
  const rtMap = new Map(researchTypes.map(r => [r.id, r.name]));

  const totalCount = total._count._all;
  const totalBilling = num(total._sum.billing);
  const wonCount = won._count._all;
  const wonBilling = num(won._sum.billing);
  const lostCount = lost._count._all;
  const lostBilling = num(lost._sum.billing);
  const openCount = totalCount - wonCount - lostCount;
  const openBilling = totalBilling - wonBilling - lostBilling;
  const closed = wonCount + lostCount;

  const sortByBilling = <T extends { billing: number }>(arr: T[]) => arr.sort((a, b) => b.billing - a.billing);

  return NextResponse.json({
    totals: { projects: totalCount, quotedBilling: totalBilling },
    won: { count: wonCount, billing: wonBilling },
    open: { count: openCount, billing: openBilling },
    lost: { count: lostCount, billing: lostBilling },
    winRate: closed ? Math.round((wonCount / closed) * 100) : 0,
    avgWon: wonCount ? Math.round(wonBilling / wonCount) : 0,
    // breakdowns below = realized (won) revenue
    byMethodology: sortByBilling(byMethodologyRaw.map(g => ({ name: g.methodology ?? "ללא", count: g._count._all, billing: num(g._sum.billing) }))).slice(0, 8),
    byManager: sortByBilling(byManagerRaw.map(g => ({ name: g.assigneeId ? (userMap.get(g.assigneeId) ?? `#${g.assigneeId}`) : "לא משויך", count: g._count._all, billing: num(g._sum.billing) }))).slice(0, 8),
    byClient: byClientRaw.map(g => ({ name: clientMap.get(g.clientId!) ?? `#${g.clientId}`, count: g._count._all, billing: num(g._sum.billing) })),
    byResearchType: sortByBilling(byResearchTypeRaw.map(g => ({ name: rtMap.get(g.researchTypeId!) ?? `#${g.researchTypeId}`, count: g._count._all, billing: num(g._sum.billing) }))).slice(0, 8),
    byStatus: byStatusRaw.map(g => ({ name: g.statusText ?? "ללא סטטוס", count: g._count._all, billing: num(g._sum.billing) })).sort((a, b) => b.count - a.count).slice(0, 20),
  });
}
