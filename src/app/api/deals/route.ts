import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateDealSchema = z.object({
  title: z.string().min(1).max(300),
  company: z.string().min(1).max(200),
  clientId: z.number().int().positive().optional(),
  value: z.number().min(0),
  probability: z.number().int().min(0).max(100).default(50),
  pipelineId: z.number().int().positive().optional(),
  stageId: z.number().int().positive().optional(),
  closeDate: z.string().datetime().optional(),
  assigneeId: z.number().int().positive().optional(),
});

const dealInclude = {
  assignee: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
  pipeline: { select: { id: true, name: true } },
  stage: { select: { id: true, label: true, color: true, probability: true } },
} as const;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const stageId = searchParams.get("stageId");
  const pipelineId = searchParams.get("pipelineId");
  const search = searchParams.get("q");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));

  const isAdmin = session.user.role === "admin";
  const userId = Number(session.user.id);

  const where = {
    ...(isAdmin ? {} : { assigneeId: userId }),
    ...(stageId ? { stageId: Number(stageId) } : {}),
    ...(pipelineId ? { pipelineId: Number(pipelineId) } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { company: { contains: search } },
          ],
        }
      : {}),
  };

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: dealInclude,
      orderBy: { value: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.deal.count({ where }),
  ]);

  return NextResponse.json({ data: deals, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;
  const userId = Number(session.user.id);
  const isAdmin = session.user.role === "admin";
  const assigneeId = isAdmin ? (data.assigneeId ?? userId) : userId;

  // Resolve the pipeline: explicit, else the default (or first active) pipeline.
  let pipelineId = data.pipelineId;
  if (!pipelineId) {
    const def = await prisma.pipeline.findFirst({
      where: { active: true },
      orderBy: [{ isDefault: "desc" }, { order: "asc" }],
    });
    if (!def) return NextResponse.json({ error: "No pipeline configured" }, { status: 409 });
    pipelineId = def.id;
  }

  // Resolve the stage: explicit (must belong to the pipeline), else the first stage.
  let stageId = data.stageId;
  if (stageId) {
    const st = await prisma.pipelineStage.findFirst({ where: { id: stageId, pipelineId } });
    if (!st) return NextResponse.json({ error: "Stage does not belong to the pipeline" }, { status: 422 });
  } else {
    const first = await prisma.pipelineStage.findFirst({
      where: { pipelineId, active: true },
      orderBy: { order: "asc" },
    });
    if (!first) return NextResponse.json({ error: "Pipeline has no stages" }, { status: 409 });
    stageId = first.id;
  }

  const deal = await prisma.deal.create({
    data: {
      title: data.title,
      company: data.company,
      clientId: data.clientId,
      value: data.value,
      probability: data.probability,
      pipelineId,
      stageId,
      closeDate: data.closeDate ? new Date(data.closeDate) : undefined,
      assigneeId,
    },
    include: dealInclude,
  });

  return NextResponse.json(deal, { status: 201 });
}
