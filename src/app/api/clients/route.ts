import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateClientSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().max(50).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  website: z.string().max(200).optional(),
  size: z.enum(["1-10", "10-50", "50-200", "200+"]).optional(),
  status: z.enum(["active", "prospect"]).default("prospect"),
  since: z.string().datetime().default(() => new Date().toISOString()),
  notes: z.string().optional(),
  assigneeId: z.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("q");
  const sort = searchParams.get("sort") ?? "name_asc";
  const assigneeFilter = searchParams.get("assigneeId");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));

  const isAdmin = session.user.role === "admin";
  const userId = Number(session.user.id);

  const where = {
    // Non-admins are always scoped to their own clients; admins may filter by manager.
    ...(isAdmin ? (assigneeFilter ? { assigneeId: Number(assigneeFilter) } : {}) : { assigneeId: userId }),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { industry: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ClientOrderByWithRelationInput =
    sort === "name_desc" ? { name: "desc" }
    : sort === "projects_desc" ? { projects: { _count: "desc" } }
    : sort === "contacts_desc" ? { contactPeople: { _count: "desc" } }
    : sort === "recent" ? { since: "desc" }
    : { name: "asc" };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true } },
        _count: { select: { projects: true, deals: true, contactPeople: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  return NextResponse.json({ data: clients, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;
  const userId = Number(session.user.id);
  const isAdmin = session.user.role === "admin";
  const assigneeId = isAdmin ? (data.assigneeId ?? userId) : userId;

  // Client name is unique in the DB — surface a friendly 409 instead of a 500.
  const existing = await prisma.client.findUnique({ where: { name: data.name }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "duplicate", existingId: existing.id }, { status: 409 });
  }

  const client = await prisma.client.create({
    data: {
      name: data.name,
      industry: data.industry,
      email: data.email,
      phone: data.phone,
      address: data.address,
      website: data.website,
      size: data.size,
      status: data.status,
      since: new Date(data.since),
      notes: data.notes,
      assigneeId,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
