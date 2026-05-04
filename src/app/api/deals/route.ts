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
  stage: z
    .enum(["lead", "discovery", "proposal", "negotiation", "closed_won"])
    .default("lead"),
  closeDate: z.string().datetime().optional(),
  assigneeId: z.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const stage = searchParams.get("stage");
  const search = searchParams.get("q");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));

  const isAdmin = session.user.role === "admin";
  const userId = Number(session.user.id);

  const where = {
    ...(isAdmin ? {} : { assigneeId: userId }),
    ...(stage ? { stage } : {}),
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
      include: {
        assignee: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
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

  const deal = await prisma.deal.create({
    data: {
      title: data.title,
      company: data.company,
      clientId: data.clientId,
      value: data.value,
      probability: data.probability,
      stage: data.stage,
      closeDate: data.closeDate ? new Date(data.closeDate) : undefined,
      assigneeId,
    },
    include: {
      assignee: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(deal, { status: 201 });
}
