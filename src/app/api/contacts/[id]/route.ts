import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const include = {
  client: { select: { id: true, name: true } },
  accountManager: { select: { id: true, name: true } },
} as const;

const UpdateContactSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  firstName: z.string().max(100).nullable().optional(),
  email: z.string().email().max(320).nullable().optional(),
  mobile: z.string().max(40).nullable().optional(),
  companyName: z.string().max(200).nullable().optional(),
  category: z.string().max(200).nullable().optional(),
  newsletterType: z.string().max(100).nullable().optional(),
  newsletter: z.boolean().optional(),
  status: z.string().max(30).nullable().optional(),
  clientId: z.number().int().positive().nullable().optional(),
  accountManagerId: z.number().int().positive().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = UpdateContactSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  if (parsed.data.clientId) {
    const c = await prisma.client.findUnique({ where: { id: parsed.data.clientId } });
    if (!c) return NextResponse.json({ error: "Client not found" }, { status: 422 });
  }

  const updated = await prisma.contact.update({ where: { id }, data: parsed.data, include });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.contact.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contact.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
