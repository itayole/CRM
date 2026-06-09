import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UpdateTaskSchema = z.object({
  desc: z.string().min(1).max(500).optional(),
  type: z.string().max(20).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().max(5).nullable().optional(),
  client: z.string().max(200).nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["open", "done"]).optional(),
  assigneeId: z.number().int().positive().optional(),
});

// Owner-or-admin: tasks are personal, so the assignee may edit/complete/delete
// their own tasks; admins may act on any.
async function getTaskOrForbid(id: number, session: Session) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return null;
  if (session.user.role !== "admin" && task.assigneeId !== Number(session.user.id)) {
    return "forbidden" as const;
  }
  return task;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  const result = await getTaskOrForbid(id, session);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (session.user.role !== "admin") delete body.assigneeId;

  const parsed = UpdateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { date, ...rest } = parsed.data;
  const updated = await prisma.task.update({
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
  const result = await getTaskOrForbid(id, session);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.task.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
