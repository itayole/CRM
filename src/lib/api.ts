// Client-side data access for the live API routes.
// Adapters translate the API/Prisma shape (assigneeId FK, Decimal value,
// activity-as-JSON-string) into the UI types used by the pages.
import type { Lead, ActivityEntry } from "@/lib/types";

// ── Lead ──────────────────────────────────────────────────────────────────
interface ApiLead {
  id: number;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  status: Lead["status"];
  score: number;
  value: string | number;
  source: string | null;
  notes: string | null;
  created: string | null;
  activity: string | null;
  assignee?: { id: number; name: string } | null;
}

function parseActivity(raw: string | null): ActivityEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toUILead(l: ApiLead): Lead {
  return {
    id: l.id,
    name: l.name,
    company: l.company,
    email: l.email ?? "",
    phone: l.phone ?? "",
    status: l.status,
    score: l.score ?? 0,
    value: Number(l.value) || 0,
    source: l.source ?? "",
    assignee: l.assignee?.name ?? "",
    notes: l.notes ?? "",
    activity: parseActivity(l.activity),
  };
}

export interface LeadCreateInput {
  name: string;
  company: string;
  email?: string;
  phone?: string;
  status?: Lead["status"];
  value?: number;
  source?: string;
  notes?: string;
  assigneeId?: number;
}

export type LeadCreateResult =
  | { status: "created"; lead: Lead }
  | { status: "duplicate"; existing: Lead }
  | { status: "error"; message: string };

async function jsonOrThrow(res: Response): Promise<unknown> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 409) {
    const msg = typeof body === "object" && body && "error" in body ? JSON.stringify((body as { error: unknown }).error) : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export async function fetchLeads(params: { status?: string; q?: string } = {}): Promise<Lead[]> {
  const qs = new URLSearchParams();
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.q) qs.set("q", params.q);
  qs.set("limit", "100");
  const res = await fetch(`/api/leads?${qs.toString()}`, { cache: "no-store" });
  const body = (await jsonOrThrow(res)) as { data: ApiLead[] };
  return (body.data ?? []).map(toUILead);
}

export async function createLead(input: LeadCreateInput): Promise<LeadCreateResult> {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await jsonOrThrow(res)) as Record<string, unknown>;
  if (res.status === 409) return { status: "duplicate", existing: toUILead(body.existing as ApiLead) };
  if (res.status === 201 && body.status === "created") return { status: "created", lead: toUILead(body.lead as ApiLead) };
  return { status: "error", message: `HTTP ${res.status}` };
}

export async function deleteLead(id: number): Promise<boolean> {
  const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
  return res.ok;
}

// ── Users (admin) ───────────────────────────────────────────────────────────
export interface CrmUser {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  joined: string | null;
  lastLogin: string | null;
}

export interface UserInput {
  name: string;
  email: string;
  role: "admin" | "sales_rep";
  active: boolean;
  password?: string;
}

export async function fetchUsers(): Promise<CrmUser[]> {
  const res = await fetch("/api/users", { cache: "no-store" });
  const body = (await jsonOrThrow(res)) as { data: CrmUser[] };
  return body.data ?? [];
}

export async function createUser(input: UserInput): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.ok) return { ok: true };
  const body = await res.json().catch(() => ({}));
  if (res.status === 409) return { ok: false, message: "כתובת המייל כבר קיימת במערכת" };
  return { ok: false, message: typeof body?.error === "string" ? body.error : "שמירת המשתמש נכשלה" };
}

export async function updateUser(id: number, patch: Partial<UserInput> & { password?: string | null }): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (res.ok) return { ok: true };
  const body = await res.json().catch(() => ({}));
  return { ok: false, message: typeof body?.error === "string" ? body.error : "עדכון המשתמש נכשל" };
}

export async function deleteUser(id: number): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (res.ok) return { ok: true };
  const body = await res.json().catch(() => ({}));
  return { ok: false, message: typeof body?.error === "string" ? body.error : "מחיקת המשתמש נכשלה" };
}
