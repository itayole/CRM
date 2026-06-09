import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const userSelect = {
  id: true, name: true, email: true, role: true, active: true, joined: true, lastLogin: true,
} as const;

const CreateUserSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  role: z.enum(["admin", "sales_rep"]).default("sales_rep"),
  active: z.boolean().default(true),
  // Optional: omit/empty for AD/LDAP-only login (no local password).
  password: z.string().min(6).max(200).optional(),
});

async function guardAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  if (session.user.role !== "admin") return { res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  return { session } as const;
}

export async function GET() {
  const g = await guardAdmin();
  if ("res" in g) return g.res;

  const users = await prisma.user.findMany({ select: userSelect, orderBy: { id: "asc" } });
  return NextResponse.json({ data: users });
}

export async function POST(req: NextRequest) {
  const g = await guardAdmin();
  if ("res" in g) return g.res;

  const body = await req.json();
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const d = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: d.email } });
  if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      role: d.role,
      active: d.active,
      password: d.password ? await bcrypt.hash(d.password, 10) : null,
    },
    select: userSelect,
  });
  return NextResponse.json(user, { status: 201 });
}
