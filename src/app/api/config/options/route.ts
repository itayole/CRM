import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CATEGORIES = ["lead_status", "lead_source", "task_type", "project_status"] as const;

const CreateSchema = z.object({
  category: z.enum(CATEGORIES),
  label: z.string().min(1).max(100),
  key: z.string().min(1).max(50).optional(),
  color: z.string().max(7).nullable().optional(),
});

// Preserve Unicode letters (Hebrew included) so distinct labels yield distinct,
// stable keys; ASCII is lower-cased. Falls back to a timestamp-free unique-ish
// token only if the label has no letters/digits at all.
const slug = (s: string) =>
  s.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 50) || "opt";

// Admin-only: full taxonomy rows (incl. inactive) for the Settings editor.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const options = await prisma.configOption.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }] });
  return NextResponse.json({ data: options });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { category, label, color } = parsed.data;
  const key = parsed.data.key ? slug(parsed.data.key) : slug(label);

  const dup = await prisma.configOption.findUnique({ where: { category_key: { category, key } } });
  if (dup) return NextResponse.json({ error: "duplicate key" }, { status: 409 });

  const max = await prisma.configOption.aggregate({ where: { category }, _max: { order: true } });
  const created = await prisma.configOption.create({
    data: { category, key, label, color: color ?? null, order: (max._max.order ?? 0) + 1, active: true },
  });
  return NextResponse.json(created, { status: 201 });
}
