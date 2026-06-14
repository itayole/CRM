import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appendActivity, nowStamp } from "@/lib/activity";

// Append a manual activity entry (note / call / email / meeting) to a lead.
// Time + user are stamped server-side; the client only supplies type + text.
const AddActivitySchema = z.object({
  type: z.enum(["note", "call", "email", "meeting", "status"]).default("note"),
  text: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role !== "admin" && lead.assigneeId !== Number(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = AddActivitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const activity = appendActivity(lead.activity, {
    type: parsed.data.type,
    text: parsed.data.text.trim(),
    time: nowStamp(),
    user: session.user.name ?? "מערכת",
  });

  const updated = await prisma.lead.update({
    where: { id },
    data: { activity },
    include: {
      assignee: { select: { id: true, name: true } },
      contact: { select: { id: true, fullName: true } },
    },
  });
  return NextResponse.json(updated);
}
