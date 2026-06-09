import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Live dashboard aggregates (global). Read-only, any signed-in user.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    clients, projects, contacts, leads, deals, users,
    leadsByStatus, projectsByMethodology, recentProjects, topClients, billingAgg, dealAgg, wonCount,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.project.count(),
    prisma.contact.count(),
    prisma.lead.count(),
    prisma.deal.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.project.groupBy({ by: ["methodology"], _count: { _all: true }, orderBy: { _count: { methodology: "desc" } }, take: 6 }),
    prisma.project.findMany({
      orderBy: { projectNo: "desc" }, take: 7,
      select: { id: true, projectNo: true, name: true, clientName: true, statusText: true, sourceCreatedAt: true, client: { select: { name: true } } },
    }),
    prisma.client.findMany({
      orderBy: { projects: { _count: "desc" } }, take: 6,
      select: { id: true, name: true, _count: { select: { projects: true } } },
    }),
    prisma.project.aggregate({ _sum: { billing: true } }),
    prisma.deal.aggregate({ _sum: { value: true } }),
    prisma.deal.count({ where: { stage: { isWon: true } } }),
  ]);

  return NextResponse.json({
    counts: { clients, projects, contacts, leads, deals, users },
    leadsByStatus: leadsByStatus.map(g => ({ status: g.status, count: g._count._all })),
    projectsByMethodology: projectsByMethodology.map(g => ({ methodology: g.methodology ?? "ללא", count: g._count._all })),
    recentProjects: recentProjects.map(p => ({
      id: p.id, projectNo: p.projectNo, name: p.name,
      client: p.client?.name ?? p.clientName ?? null, statusText: p.statusText, createdAt: p.sourceCreatedAt,
    })),
    topClients: topClients.map(c => ({ id: c.id, name: c.name, projectCount: c._count.projects })),
    totalProjectBilling: Number(billingAgg._sum.billing ?? 0),
    deals: { count: deals, value: Number(dealAgg._sum.value ?? 0), won: wonCount, winRate: deals ? Math.round((wonCount / deals) * 100) : 0 },
  });
}
