import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Read-only config for any signed-in user: configurable taxonomies + lookup lists.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [options, researchTypes, researchMethods, products] = await Promise.all([
    prisma.configOption.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { order: "asc" }] }),
    prisma.researchType.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.researchMethod.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const byCat = (cat: string) =>
    options.filter(o => o.category === cat).map(o => ({ key: o.key, label: o.label, color: o.color }));

  return NextResponse.json({
    leadStatuses: byCat("lead_status"),
    leadSources: byCat("lead_source"),
    taskTypes: byCat("task_type"),
    projectStatuses: byCat("project_status"),
    researchTypes,
    researchMethods,
    products,
  });
}
