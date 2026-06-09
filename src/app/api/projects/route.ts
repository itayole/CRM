import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(300),
  clientId: z.number().int().positive().optional(),
  assigneeId: z.number().int().positive().optional(),
  model: z.string().max(100).optional(),
  methodology: z.string().max(100).optional(),
  statusText: z.string().max(100).optional(),
  billing: z.number().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("q");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));

  const isAdmin = session.user.role === "admin";
  const userId = Number(session.user.id);

  const where = {
    ...(isAdmin ? {} : { assigneeId: userId }),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { clientName: { contains: search } },
            { shiluvNo: { contains: search } },
          ],
        }
      : {}),
  };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { projectNo: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.project.count({ where }),
  ]);

  return NextResponse.json({ data: projects, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const data = parsed.data;
  const userId = Number(session.user.id);
  const isAdmin = session.user.role === "admin";
  // sales_rep can only create projects assigned to themselves
  const assigneeId = isAdmin ? (data.assigneeId ?? userId) : userId;

  if (data.clientId) {
    const c = await prisma.client.findUnique({ where: { id: data.clientId }, select: { id: true } });
    if (!c) return NextResponse.json({ error: "Client not found" }, { status: 422 });
  }

  // CRM-created project (no M-Files projectNo). Stamp source/updated dates so it
  // sorts and displays alongside synced projects.
  const now = new Date();
  const project = await prisma.project.create({
    data: {
      name: data.name,
      clientId: data.clientId,
      assigneeId,
      model: data.model,
      methodology: data.methodology,
      statusText: data.statusText,
      billing: data.billing,
      sourceCreatedAt: now,
      lastUpdated: now,
    },
    include: {
      client: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(project, { status: 201 });
}
