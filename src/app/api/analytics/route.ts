import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Live sales analytics (deal-centric): KPIs, pipeline-by-stage, revenue per rep,
// and the open-deals table. Read-only. RBAC mirrors /api/deals — admins see all
// deals, sales reps see only their own. Optional ?pipelineId= filter.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const pipelineParam = searchParams.get("pipelineId");
  const pipelineId = pipelineParam ? Number(pipelineParam) : undefined;

  const isAdmin = session.user.role === "admin";
  const userId = Number(session.user.id);

  // Base scope applied to every deal query below.
  const where = {
    ...(isAdmin ? {} : { assigneeId: userId }),
    ...(pipelineId ? { pipelineId } : {}),
  };

  // Stage flags drive won/lost/open classification — fetch them first so the
  // deal aggregates can filter on the right stage-id sets (index-friendly).
  const stages = await prisma.pipelineStage.findMany({
    where: pipelineId ? { pipelineId } : {},
    select: { id: true, label: true, color: true, order: true, isWon: true, isLost: true },
    orderBy: [{ pipelineId: "asc" }, { order: "asc" }],
  });
  const wonIds = stages.filter(s => s.isWon).map(s => s.id);
  const lostIds = stages.filter(s => s.isLost).map(s => s.id);
  const closedIds = [...wonIds, ...lostIds];

  const wonWhere = { ...where, stageId: { in: wonIds } };
  const lostWhere = { ...where, stageId: { in: lostIds } };
  const openWhere = { ...where, stageId: { notIn: closedIds } };

  const [byStage, byAssigneeTotal, byAssigneeWon, totalAgg, wonAgg, openAgg, lostCount, activeDeals, users] =
    await Promise.all([
      prisma.deal.groupBy({ by: ["stageId"], where, _count: { _all: true }, _sum: { value: true } }),
      prisma.deal.groupBy({ by: ["assigneeId"], where, _count: { _all: true }, _sum: { value: true } }),
      prisma.deal.groupBy({ by: ["assigneeId"], where: wonWhere, _count: { _all: true }, _sum: { value: true } }),
      prisma.deal.aggregate({ where, _count: { _all: true }, _sum: { value: true } }),
      prisma.deal.aggregate({ where: wonWhere, _count: { _all: true }, _sum: { value: true } }),
      prisma.deal.aggregate({ where: openWhere, _count: { _all: true }, _sum: { value: true } }),
      prisma.deal.count({ where: lostWhere }),
      prisma.deal.findMany({
        where: openWhere,
        orderBy: { value: "desc" },
        take: 50,
        select: {
          id: true, title: true, company: true, value: true, probability: true, health: true, closeDate: true,
          stage: { select: { label: true, color: true } },
          assignee: { select: { id: true, name: true } },
        },
      }),
      prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
    ]);

  const stageMap = new Map(stages.map(s => [s.id, s]));
  const userMap = new Map(users.map(u => [u.id, u.name]));

  const totalCount = totalAgg._count._all;
  const wonCount = wonAgg._count._all;
  const closedCount = wonCount + lostCount;

  // Pipeline by stage (in configured stage order), used by the funnel/pie chart.
  const byStageCount = new Map(byStage.map(g => [g.stageId, g]));
  const stageBreakdown = stages.map(s => {
    const g = byStageCount.get(s.id);
    return {
      stageId: s.id, label: s.label, color: s.color,
      count: g?._count._all ?? 0, value: Number(g?._sum.value ?? 0),
    };
  });

  // Revenue per rep — won value drives the team-performance bar chart; total
  // pipeline value and deal count come along for context.
  const wonByAssignee = new Map(byAssigneeWon.map(g => [g.assigneeId, g]));
  const teamPerformance = byAssigneeTotal
    .map(g => ({
      assigneeId: g.assigneeId,
      name: userMap.get(g.assigneeId) ?? `#${g.assigneeId}`,
      totalValue: Number(g._sum.value ?? 0),
      wonValue: Number(wonByAssignee.get(g.assigneeId)?._sum.value ?? 0),
      count: g._count._all,
    }))
    .sort((a, b) => b.wonValue - a.wonValue || b.totalValue - a.totalValue);

  return NextResponse.json({
    kpis: {
      totalCount,
      openCount: openAgg._count._all,
      wonCount,
      lostCount,
      openValue: Number(openAgg._sum.value ?? 0),
      wonValue: Number(wonAgg._sum.value ?? 0),
      totalValue: Number(totalAgg._sum.value ?? 0),
      avgDealValue: totalCount ? Math.round(Number(totalAgg._sum.value ?? 0) / totalCount) : 0,
      winRate: closedCount ? Math.round((wonCount / closedCount) * 100) : 0,
    },
    byStage: stageBreakdown,
    teamPerformance,
    activeDeals: activeDeals.map(d => ({
      id: d.id, title: d.title, company: d.company, value: Number(d.value),
      probability: d.probability, health: d.health,
      closeDate: d.closeDate ? d.closeDate.toISOString().slice(0, 10) : null,
      stageLabel: d.stage?.label ?? null, stageColor: d.stage?.color ?? null,
      assignee: d.assignee?.name ?? null,
    })),
  });
}
