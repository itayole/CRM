import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({ name: z.string().min(1).max(100) });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const max = await prisma.pipeline.aggregate({ _max: { order: true } });
  const count = await prisma.pipeline.count();
  const created = await prisma.pipeline.create({
    data: { name: parsed.data.name, order: (max._max.order ?? 0) + 1, isDefault: count === 0, active: true },
  });
  return NextResponse.json(created, { status: 201 });
}
