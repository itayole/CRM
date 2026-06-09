import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const include = {
  client: { select: { id: true, name: true } },
  accountManager: { select: { id: true, name: true } },
} as const;

const CreateContactSchema = z.object({
  fullName: z.string().min(1).max(200),
  firstName: z.string().max(100).optional(),
  email: z.string().email().max(320).optional(),
  mobile: z.string().max(40).optional(),
  companyName: z.string().max(200).optional(),
  category: z.string().max(200).optional(),
  newsletterType: z.string().max(100).optional(),
  newsletter: z.boolean().default(false),
  status: z.string().max(30).optional(),
  clientId: z.number().int().positive().optional(),
  accountManagerId: z.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("q");
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));

  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? { OR: [{ fullName: { contains: search } }, { email: { contains: search } }, { companyName: { contains: search } }] }
      : {}),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({ where, include, orderBy: { fullName: "asc" }, skip: (page - 1) * limit, take: limit }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({ data: contacts, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateContactSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const contact = await prisma.contact.create({ data: parsed.data, include });
  return NextResponse.json(contact, { status: 201 });
}
