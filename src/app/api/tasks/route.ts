import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateTaskSchema = z.object({
  desc: z.string().min(1).max(500),
  type: z.string().max(20).default("other"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  time: z.string().max(5).nullable().optional(),
  client: z.string().max(200).nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["open", "done"]).default("open"),
  assigneeId: z.number().int().positive().optional(),
});

// Parse a YYYY-MM-DD string to a UTC-midnight Date so the calendar day is stable
// regardless of server timezone.
const toDate = (d: string) => new Date(`${d}T00:00:00.000Z`);

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("q");
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 200)));

  const isAdmin = session.user.role === "admin";
  const userId = Number(session.user.id);

  const where = {
    ...(isAdmin ? {} : { assigneeId: userId }),
    ...(status === "open" || status === "done" ? { status } : {}),
    ...(search
      ? { OR: [{ desc: { contains: search } }, { client: { contains: search } }] }
      : {}),
  };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: { assignee: { select: { id: true, name: true } } },
      orderBy: [{ status: "asc" }, { date: "asc" }],
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  return NextResponse.json({ data: tasks, total });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;
  const userId = Number(session.user.id);
  const isAdmin = session.user.role === "admin";
  // sales_rep can only create tasks assigned to themselves
  const assigneeId = isAdmin ? (data.assigneeId ?? userId) : userId;

  const task = await prisma.task.create({
    data: {
      desc: data.desc,
      type: data.type,
      priority: data.priority,
      date: toDate(data.date),
      time: data.time ?? null,
      client: data.client ?? null,
      notes: data.notes ?? null,
      status: data.status,
      assigneeId,
    },
    include: { assignee: { select: { id: true, name: true } } },
  });

  return NextResponse.json(task, { status: 201 });
}
