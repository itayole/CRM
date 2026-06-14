import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appendActivity, nowStamp } from "@/lib/activity";

// Convert a lead into a research project. The project inherits the lead's
// client/contact/assignee/value and research lookups; the lead is KEPT and
// marked status="converted" with an activity entry for full traceability.
const ConvertSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  billing: z.number().min(0).optional(),
  model: z.string().max(100).optional(),
  methodology: z.string().max(100).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role !== "admin" && lead.assigneeId !== Number(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (lead.status === "converted") {
    return NextResponse.json({ error: "הליד כבר הומר לפרויקט" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = ConvertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const o = parsed.data;

  const projectName = (o.name ?? lead.company ?? lead.name).trim() || lead.name;
  const now = new Date();
  const user = session.user.name ?? "מערכת";

  // Create the project and flip the lead atomically so we never end up with a
  // project but an unconverted lead (or vice versa).
  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: projectName,
        clientId: lead.clientId ?? undefined,
        contactId: lead.contactId ?? undefined,
        assigneeId: lead.assigneeId,
        billing: o.billing ?? lead.value ?? undefined,
        model: o.model,
        methodology: o.methodology,
        researchTypeId: lead.researchTypeId ?? undefined,
        researchMethodId: lead.researchMethodId ?? undefined,
        productId: lead.productId ?? undefined,
        sourceCreatedAt: now,
        lastUpdated: now,
      },
    });

    const activity = appendActivity(lead.activity, {
      type: "status",
      text: `הומר לפרויקט «${projectName}» (#${project.id})`,
      time: nowStamp(),
      user,
    });

    const updatedLead = await tx.lead.update({
      where: { id },
      data: { status: "converted", activity },
      include: {
        assignee: { select: { id: true, name: true } },
        contact: { select: { id: true, fullName: true } },
      },
    });

    return { project, lead: updatedLead };
  });

  return NextResponse.json({ ok: true, projectId: result.project.id, lead: result.lead }, { status: 201 });
}
