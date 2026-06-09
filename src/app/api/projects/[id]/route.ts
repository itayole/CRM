import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  clientId: z.number().int().positive().nullable().optional(),
  contactId: z.number().int().positive().nullable().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  methodology: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  statusText: z.string().max(100).nullable().optional(),
  billing: z.number().min(0).nullable().optional(),
});

const include = {
  client: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
  contact: { select: { id: true, fullName: true } },
} as const;

async function getProjectOrForbid(id: number, session: Session) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return null;
  if (session.user.role !== "admin" && project.assigneeId !== Number(session.user.id)) {
    return "forbidden" as const;
  }
  return project;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await getProjectOrForbid(Number(id), session);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const full = await prisma.project.findUnique({ where: { id: Number(id) }, include });
  return NextResponse.json(full);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  const result = await getProjectOrForbid(id, session);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (session.user.role !== "admin") delete body.assigneeId;

  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  // If relinking to a client, validate it exists.
  if (parsed.data.clientId) {
    const c = await prisma.client.findUnique({ where: { id: parsed.data.clientId } });
    if (!c) return NextResponse.json({ error: "Client not found" }, { status: 422 });
  }
  if (parsed.data.contactId) {
    const ct = await prisma.contact.findUnique({ where: { id: parsed.data.contactId } });
    if (!ct) return NextResponse.json({ error: "Contact not found" }, { status: 422 });
  }

  const updated = await prisma.project.update({ where: { id }, data: parsed.data, include });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id: Number(id) } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
