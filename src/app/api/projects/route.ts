import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
