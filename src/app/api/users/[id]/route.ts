import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const userSelect = {
  id: true, name: true, email: true, role: true, active: true, joined: true, lastLogin: true,
} as const;

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).optional(),
  role: z.enum(["admin", "sales_rep"]).optional(),
  active: z.boolean().optional(),
  // null clears the local password (AD/LDAP-only); a string sets a new one; undefined leaves it.
  password: z.string().min(6).max(200).nullable().optional(),
});

async function guardAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  if (session.user.role !== "admin") return { res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  return { session } as const;
}

const activeAdminCount = () => prisma.user.count({ where: { role: "admin", active: true } });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin();
  if ("res" in g) return g.res;

  const { id: rawId } = await params;
  const id = Number(rawId);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = UpdateUserSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const d = parsed.data;

  const resultingRole = d.role ?? target.role;
  const resultingActive = d.active ?? target.active;
  const isSelf = id === Number(g.session.user.id);

  // Don't let an admin lock themselves out.
  if (isSelf && (resultingRole !== "admin" || resultingActive === false)) {
    return NextResponse.json({ error: "אינך יכול להסיר את הרשאות הניהול / להשבית את עצמך" }, { status: 422 });
  }
  // Keep at least one active admin.
  const wasActiveAdmin = target.role === "admin" && target.active;
  const losesAdmin = wasActiveAdmin && (resultingRole !== "admin" || resultingActive === false);
  if (losesAdmin && (await activeAdminCount()) <= 1) {
    return NextResponse.json({ error: "חייב להישאר לפחות מנהל מערכת פעיל אחד" }, { status: 422 });
  }

  const data: Prisma.UserUpdateInput = {};
  if (d.name !== undefined) data.name = d.name;
  if (d.email !== undefined) data.email = d.email;
  if (d.role !== undefined) data.role = d.role;
  if (d.active !== undefined) data.active = d.active;
  if (d.password !== undefined) data.password = d.password ? await bcrypt.hash(d.password, 10) : null;

  try {
    const updated = await prisma.user.update({ where: { id }, data, select: userSelect });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin();
  if ("res" in g) return g.res;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (id === Number(g.session.user.id)) {
    return NextResponse.json({ error: "אינך יכול למחוק את עצמך" }, { status: 422 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.role === "admin" && target.active && (await activeAdminCount()) <= 1) {
    return NextResponse.json({ error: "חייב להישאר לפחות מנהל מערכת פעיל אחד" }, { status: 422 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    // FK constraint — user still owns leads/deals/clients/tasks/events.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return NextResponse.json(
        { error: "לא ניתן למחוק — למשתמש משויכים רשומות (לידים/עסקאות/לקוחות). יש להשבית אותו או להעביר את הרשומות תחילה." },
        { status: 409 }
      );
    }
    throw e;
  }
}
