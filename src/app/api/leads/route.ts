import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateLeadSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  email: z.string().email().max(320).optional(),
  phone: z.string().max(30).optional(),
  // status validated against configured lead_status options at runtime
  status: z.string().max(50).optional(),
  value: z.number().min(0).default(0),
  source: z.string().max(50).optional(),
  notes: z.string().optional(),
  assigneeId: z.number().int().positive().optional(),
  clientId: z.number().int().positive().optional(),
  contactId: z.number().int().positive().optional(),
  researchTypeId: z.number().int().positive().optional(),
  researchMethodId: z.number().int().positive().optional(),
  productId: z.number().int().positive().optional(),
});

function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/[\s\-()]/g, "");
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("q");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));

  const isAdmin = session.user.role === "admin";
  const userId = Number(session.user.id);

  const where = {
    ...(isAdmin ? {} : { assigneeId: userId }),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { company: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { assignee: { select: { id: true, name: true } }, contact: { select: { id: true, fullName: true } } },
      orderBy: { created: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({ data: leads, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;
  const userId = Number(session.user.id);
  const isAdmin = session.user.role === "admin";

  // sales_rep can only create leads assigned to themselves
  const assigneeId = isAdmin ? (data.assigneeId ?? userId) : userId;

  // Resolve/validate status against the configured lead_status options
  const statuses = await prisma.configOption.findMany({
    where: { category: "lead_status", active: true },
    orderBy: { order: "asc" },
    select: { key: true },
  });
  const validStatus = new Set(statuses.map(o => o.key));
  let status = data.status;
  if (status && !validStatus.has(status)) {
    return NextResponse.json({ error: `Unknown status '${status}'` }, { status: 422 });
  }
  if (!status) status = statuses[0]?.key ?? "new";

  // Dedup check: phone OR company OR name
  const normalizedPhone = normalizePhone(data.phone);
  const existing = await prisma.lead.findFirst({
    where: {
      OR: [
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        { company: data.company },
        { name: data.name },
      ],
    },
  });

  if (existing) {
    return NextResponse.json(
      { status: "duplicate", existing },
      { status: 409 }
    );
  }

  const lead = await prisma.lead.create({
    data: {
      name: data.name,
      company: data.company,
      email: data.email,
      phone: normalizedPhone ?? data.phone,
      status,
      value: data.value,
      source: data.source,
      notes: data.notes,
      assigneeId,
      clientId: data.clientId,
      contactId: data.contactId,
      researchTypeId: data.researchTypeId,
      researchMethodId: data.researchMethodId,
      productId: data.productId,
    },
    include: { assignee: { select: { id: true, name: true } }, contact: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json({ status: "created", lead }, { status: 201 });
}
