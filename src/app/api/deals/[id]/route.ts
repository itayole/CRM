import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UpdateDealSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  company: z.string().min(1).max(200).optional(),
  clientId: z.number().int().positive().nullable().optional(),
  value: z.number().min(0).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  stage: z
    .enum(["lead", "discovery", "proposal", "negotiation", "closed_won"])
    .optional(),
  closeDate: z.string().datetime().nullable().optional(),
  health: z.number().int().min(0).max(100).optional(),
  assigneeId: z.number().int().positive().optional(),
});

async function getDealOrForbid(
  id: number,
  session: Awaited<ReturnType<typeof getServerSession>>
) {
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  });
  if (!deal) return null;
  if (session!.user.role !== "admin" && deal.assigneeId !== Number(session!.user.id)) {
    return "forbidden" as const;
  }
  return deal;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getDealOrForbid(Number(params.id), session);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const result = await getDealOrForbid(id, session);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (session.user.role !== "admin") delete body.assigneeId;

  const parsed = UpdateDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { closeDate, ...rest } = parsed.data;
  const updated = await prisma.deal.update({
    where: { id },
    data: {
      ...rest,
      ...(closeDate !== undefined
        ? { closeDate: closeDate ? new Date(closeDate) : null }
        : {}),
    },
    include: {
      assignee: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number(params.id);
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.deal.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
