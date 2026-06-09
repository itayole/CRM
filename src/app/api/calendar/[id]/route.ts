import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Owner-or-admin: calendar events are personal, so the assignee may delete
// their own; admins may delete any.
async function getEventOrForbid(id: number, session: Session) {
  const event = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!event) return null;
  if (session.user.role !== "admin" && event.assigneeId !== Number(session.user.id)) {
    return "forbidden" as const;
  }
  return event;
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
