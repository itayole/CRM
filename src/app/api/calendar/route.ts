import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateEventSchema = z.object({
  title: z.string().min(1).max(400),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  time: z.string().max(5).nullable().optional(),
  endTime: z.string().max(5).nullable().optional(),
  type: z.string().max(20).default("meeting"),
  client: z.string().max(200).nullable().optional(),
  notes: z.string().nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  color: z.string().max(7).nullable().optional(),
  assigneeId: z.number().int().positive().optional(),
});

// Store the calendar day at UTC midnight so it round-trips to the same date
// regardless of server timezone.
const toDate = (d: string) => new Date(`${d}T00:00:00.000Z`);

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const assigneeId = searchParams.get("assigneeId");
  const limit = Math.min(1000, Math.max(1, Number(searchParams.get("limit") ?? 500)));

  const isAdmin = session.user.role === "admin";
  const userId = Number(session.user.id);

  const where = isAdmin
    ? (assigneeId ? { assigneeId: Number(assigneeId) } : {})
    : { assigneeId: userId };

  const events = await prisma.calendarEvent.findMany({
    where,
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    take: limit,
  });

  return NextResponse.json({ data: events, total: events.length });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;
  const userId = Number(session.user.id);
  const isAdmin = session.user.role === "admin";
  // sales_rep can only create events for themselves
  const assigneeId = isAdmin ? (data.assigneeId ?? userId) : userId;

  const event = await prisma.calendarEvent.create({
    data: {
      title: data.title,
      date: toDate(data.date),
      time: data.time ?? null,
      endTime: data.endTime ?? null,
      type: data.type,
      client: data.client ?? null,
      notes: data.notes ?? null,
      location: data.location ?? null,
      color: data.color ?? null,
      assigneeId,
    },
    include: { assignee: { select: { id: true, name: true } } },
  });

  return NextResponse.json(event, { status: 201 });
}
