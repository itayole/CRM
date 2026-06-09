import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UpdateLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  company: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  status: z.enum(["new", "contacted", "qualified", "disqualified"]).optional(),
  score: z.number().int().min(0).max(100).optional(),
  value: z.number().min(0).optional(),
  source: z.string().max(50).nullable().optional(),
  notes: z.string().nullable().optional(),
  assigneeId: z.number().int().positive().optional(),
  clientId: z.number().int().positive().nullable().optional(),
  activity: z.string().optional(),
});

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

  const updated = await prisma.lead.update({ where: { id }, data: parsed.data });
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
