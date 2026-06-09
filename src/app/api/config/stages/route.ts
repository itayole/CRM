import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  pipelineId: z.number().int().positive(),
  label: z.string().min(1).max(100),
  color: z.string().max(7).nullable().optional(),
  probability: z.number().int().min(0).max(100).default(0),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { pipelineId, label, color, probability, isWon, isLost } = parsed.data;

  const pipeline = await prisma.pipeline.findUnique({ where: { id: pipelineId } });
  if (!pipeline) return NextResponse.json({ error: "Pipeline not found" }, { status: 422 });

  const max = await prisma.pipelineStage.aggregate({ where: { pipelineId }, _max: { order: true } });
  const created = await prisma.pipelineStage.create({
    data: { pipelineId, label, color: color ?? null, probability, isWon, isLost, order: (max._max.order ?? 0) + 1, active: true },
  });
  return NextResponse.json(created, { status: 201 });
}
