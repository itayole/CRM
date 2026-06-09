import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UpdateEventSchema = z.object({
  title: z.string().min(1).max(400).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().max(5).nullable().optional(),
  endTime: z.string().max(5).nullable().optional(),
  type: z.string().max(20).optional(),
  client: z.string().max(200).nullable().optional(),
  notes: z.string().nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  color: z.string().max(7).nullable().optional(),
  assigneeId: z.number().int().positive().optional(),
});

// Owner-or-admin: calendar events are personal, so the assignee may edit/delete
// their own; admins may act on any.
async function getEventOrForbid(id: number, session: Session) {
  const event = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!event) return null;
  if (session.user.role !== "admin" && event.assigneeId !== Number(session.user.id)) {
    return "forbidden" as const;
  }
  return event;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  const result = await getEventOrForbid(id, session);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (session.user.role !== "admin") delete body.assigneeId;

  const parsed = UpdateEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { date, ...rest } = parsed.data;
  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: { ...rest, ...(date ? { date: new Date(`${date}T00:00:00.000Z`) } : {}) },
    include: { assignee: { select: { id: true, name: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  const result = await getEventOrForbid(id, session);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.calendarEvent.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
