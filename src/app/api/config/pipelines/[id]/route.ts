import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = Number(rawId);
  const parsed = UpdateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const existing = await prisma.pipeline.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only one default pipeline at a time.
  if (parsed.data.isDefault) {
    await prisma.pipeline.updateMany({ where: { isDefault: true, NOT: { id } }, data: { isDefault: false } });
  }
  const updated = await prisma.pipeline.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = Number(rawId);
  const existing = await prisma.pipeline.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const deals = await prisma.deal.count({ where: { pipelineId: id } });
  if (deals > 0) return NextResponse.json({ error: `לא ניתן למחוק — לצינור משויכות ${deals} עסקאות` }, { status: 409 });

  // Stages cascade-delete with the pipeline.
  await prisma.pipeline.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
