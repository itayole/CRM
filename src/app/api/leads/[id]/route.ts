import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appendActivity, nowStamp, LEAD_STATUS_LABELS, type ActivityEntry } from "@/lib/activity";

const UpdateLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  company: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  status: z.enum(["new", "contacted", "qualified", "disqualified", "converted"]).optional(),
  score: z.number().int().min(0).max(100).optional(),
  value: z.number().min(0).optional(),
  source: z.string().max(50).nullable().optional(),
  notes: z.string().nullable().optional(),
  assigneeId: z.number().int().positive().optional(),
  clientId: z.number().int().positive().nullable().optional(),
  contactId: z.number().int().positive().nullable().optional(),
});

// Human labels for the fields we surface in an auto-logged "lead edited" entry.
const EDIT_FIELD_LABELS: Record<string, string> = {
  name: "שם", company: "חברה", email: "מייל", phone: "טלפון",
  score: "ציון", value: "שווי", source: "מקור", notes: "הערות",
  assigneeId: "נציג", clientId: "לקוח מקושר", contactId: "איש קשר",
};

async function getLeadOrForbid(id: number, session: Session | null) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return null;
  if (session!.user.role !== "admin" && lead.assigneeId !== Number(session!.user.id)) {
    return "forbidden" as const;
  }
  return lead;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const result = await getLeadOrForbid(Number(rawId), session);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  const result = await getLeadOrForbid(id, session);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (session.user.role !== "admin") delete body.assigneeId;

  const parsed = UpdateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;
  const lead = result; // full existing record (already auth-checked above)

  // Auto-log activity: a dedicated entry for a status change, plus a compact
  // "edited" entry listing any other changed fields.
  const entries: ActivityEntry[] = [];
  const stamp = nowStamp();
  const actor = session.user.name ?? "מערכת";

  if (data.status !== undefined && data.status !== lead.status) {
    entries.push({
      type: "status",
      text: `סטטוס: ${LEAD_STATUS_LABELS[lead.status] ?? lead.status} → ${LEAD_STATUS_LABELS[data.status] ?? data.status}`,
      time: stamp, user: actor,
    });
  }

  const changed: string[] = [];
  for (const key of Object.keys(EDIT_FIELD_LABELS)) {
    if (!(key in data)) continue;
    const next = (data as Record<string, unknown>)[key];
    const prev = key === "value" ? Number(lead.value) : (lead as Record<string, unknown>)[key];
    const nextCmp = key === "value" ? Number(next) : next;
    if (nextCmp !== prev) changed.push(EDIT_FIELD_LABELS[key]);
  }
  if (changed.length) {
    entries.push({ type: "note", text: `עודכן: ${changed.join(", ")}`, time: stamp, user: actor });
  }

  let activity = lead.activity;
  for (const e of entries) activity = appendActivity(activity, e);

  const updated = await prisma.lead.update({
    where: { id },
    data: { ...data, ...(entries.length ? { activity } : {}) },
    include: { assignee: { select: { id: true, name: true } }, contact: { select: { id: true, fullName: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = Number(rawId);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.lead.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
