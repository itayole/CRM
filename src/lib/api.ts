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
  status?: string;
  value?: number;
  source?: string;
  notes?: string;
  assigneeId?: number;
  clientId?: number;
  researchTypeId?: number;
  researchMethodId?: number;
  productId?: number;
}

// ── App config (taxonomies + lookups) ───────────────────────────────────────
export interface ConfigItem { key: string; label: string; color: string | null }
export interface PipelineStageCfg { id: number; label: string; color: string | null; probability: number; isWon: boolean; isLost: boolean }
export interface PipelineCfg { id: number; name: string; isDefault: boolean; stages: PipelineStageCfg[] }
export interface AppConfig {
  leadStatuses: ConfigItem[];
  leadSources: ConfigItem[];
  taskTypes: ConfigItem[];
  projectStatuses: ConfigItem[];
  researchTypes: Named[];
  researchMethods: Named[];
  products: Named[];
  pipelines: PipelineCfg[];
}
export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch("/api/config", { cache: "no-store" });
  return (await jsonOrThrow(res)) as AppConfig;
}

// ── Dashboard stats ─────────────────────────────────────────────────────────
export interface DashboardStats {
  counts: { clients: number; projects: number; contacts: number; leads: number; deals: number; users: number };
  leadsByStatus: { status: string; count: number }[];
  projectsByMethodology: { methodology: string; count: number }[];
  recentProjects: { id: number; projectNo: number | null; name: string; client: string | null; statusText: string | null; createdAt: string | null }[];
  topClients: { id: number; name: string; projectCount: number }[];
  totalProjectBilling: number;
  deals: { count: number; value: number; won: number; winRate: number };
}
export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch("/api/stats", { cache: "no-store" });
  return (await jsonOrThrow(res)) as DashboardStats;
}

// ── Tasks ────────────────────────────────────────────────────────────────────
export interface CrmTask {
  id: number; desc: string; type: string; priority: "high" | "medium" | "low";
  date: string; time: string | null; client: string | null; notes: string | null;
  status: "open" | "done"; assignee: Named | null;
}
interface ApiTask {
  id: number; desc: string; type: string; priority: "high" | "medium" | "low";
  date: string; time: string | null; client: string | null; notes: string | null;
  status: "open" | "done"; assignee: Named | null;
}
const toUITask = (t: ApiTask): CrmTask => ({
  id: t.id, desc: t.desc, type: t.type, priority: t.priority,
  date: t.date ? String(t.date).slice(0, 10) : "", time: t.time, client: t.client,
  notes: t.notes, status: t.status, assignee: t.assignee ?? null,
});
export interface TaskInput {
  desc: string; type?: string; priority?: "high" | "medium" | "low";
  date: string; time?: string | null; client?: string | null; notes?: string | null;
  status?: "open" | "done"; assigneeId?: number;
}
export async function fetchTasks(params: { status?: string; q?: string } = {}): Promise<CrmTask[]> {
  const qs = new URLSearchParams();
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.q) qs.set("q", params.q);
  const res = await fetch(`/api/tasks?${qs}`, { cache: "no-store" });
  const body = (await jsonOrThrow(res)) as { data: ApiTask[] };
  return (body.data ?? []).map(toUITask);
}
export async function createTask(input: TaskInput): Promise<{ ok: boolean; task?: CrmTask; message?: string }> {
  const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (res.ok) return { ok: true, task: toUITask((await res.json()) as ApiTask) };
  const b = await res.json().catch(() => ({}));
  return { ok: false, message: typeof b?.error === "string" ? b.error : "שמירת המשימה נכשלה" };
}
export async function updateTask(id: number, patch: Partial<TaskInput>): Promise<{ ok: boolean; task?: CrmTask; message?: string }> {
  const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  if (res.ok) return { ok: true, task: toUITask((await res.json()) as ApiTask) };
  const b = await res.json().catch(() => ({}));
  return { ok: false, message: typeof b?.error === "string" ? b.error : "עדכון המשימה נכשל" };
}
export async function deleteTask(id: number): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (res.ok) return { ok: true };
  const b = await res.json().catch(() => ({}));
  return { ok: false, message: typeof b?.error === "string" ? b.error : "מחיקת המשימה נכשלה" };
}

// ── Calendar events ──────────────────────────────────────────────────────────
export interface CrmCalendarEvent {
  id: number; title: string; date: string; time: string; endTime: string;
  type: string; client: string; notes: string; location: string; color: string;
  assignee: string; assigneeId: number;
}
interface ApiCalendarEvent {
  id: number; title: string; date: string; time: string | null; endTime: string | null;
  type: string; client: string | null; notes: string | null; location: string | null;
  color: string | null; assigneeId: number; assignee: Named | null;
}
const toUIEvent = (e: ApiCalendarEvent): CrmCalendarEvent => ({
  id: e.id, title: e.title, date: e.date ? String(e.date).slice(0, 10) : "",
  time: e.time ?? "", endTime: e.endTime ?? "", type: e.type,
  client: e.client ?? "", notes: e.notes ?? "", location: e.location ?? "", color: e.color ?? "",
  assignee: e.assignee?.name ?? "", assigneeId: e.assigneeId,
});
export interface CalendarEventInput {
  title: string; date: string; time?: string | null; endTime?: string | null;
  type?: string; client?: string | null; notes?: string | null; location?: string | null;
  color?: string | null; assigneeId?: number;
}
export async function fetchCalendarEvents(params: { assigneeId?: number } = {}): Promise<CrmCalendarEvent[]> {
  const qs = new URLSearchParams();
  if (params.assigneeId) qs.set("assigneeId", String(params.assigneeId));
  const res = await fetch(`/api/calendar?${qs}`, { cache: "no-store" });
  const body = (await jsonOrThrow(res)) as { data: ApiCalendarEvent[] };
  return (body.data ?? []).map(toUIEvent);
}
export async function createCalendarEvent(input: CalendarEventInput): Promise<{ ok: boolean; event?: CrmCalendarEvent; message?: string }> {
  const res = await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (res.ok) return { ok: true, event: toUIEvent((await res.json()) as ApiCalendarEvent) };
  const b = await res.json().catch(() => ({}));
  return { ok: false, message: typeof b?.error === "string" ? b.error : "שמירת האירוע נכשלה" };
}
export async function deleteCalendarEvent(id: number): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/calendar/${id}`, { method: "DELETE" });
  if (res.ok) return { ok: true };
  const b = await res.json().catch(() => ({}));
  return { ok: false, message: typeof b?.error === "string" ? b.error : "מחיקת האירוע נכשלה" };
}

// ── Sales analytics (deal-centric) ──────────────────────────────────────────
export interface SalesAnalytics {
  kpis: {
    totalCount: number; openCount: number; wonCount: number; lostCount: number;
    openValue: number; wonValue: number; totalValue: number; avgDealValue: number; winRate: number;
  };
  byStage: { stageId: number; label: string; color: string | null; count: number; value: number }[];
  teamPerformance: { assigneeId: number; name: string; totalValue: number; wonValue: number; count: number }[];
  activeDeals: {
    id: number; title: string; company: string; value: number; probability: number; health: number;
    closeDate: string | null; stageLabel: string | null; stageColor: string | null; assignee: string | null;
  }[];
}
export async function fetchAnalytics(params: { pipelineId?: number } = {}): Promise<SalesAnalytics> {
  const qs = new URLSearchParams();
  if (params.pipelineId) qs.set("pipelineId", String(params.pipelineId));
  const res = await fetch(`/api/analytics?${qs}`, { cache: "no-store" });
  return (await jsonOrThrow(res)) as SalesAnalytics;
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

// ── Paginated list envelope ─────────────────────────────────────────────────
export interface Page<T> { data: T[]; total: number; page: number; limit: number }
export interface Named { id: number; name: string }

// ── Clients ─────────────────────────────────────────────────────────────────
export interface CrmClientRow {
  id: number; name: string; industry: string | null; email: string | null; phone: string | null;
  status: string | null; assignee: Named | null;
  projectCount: number; contactCount: number; dealCount: number;
}
interface ApiClient {
  id: number; name: string; industry: string | null; email: string | null; phone: string | null;
  status: string | null; assignee: Named | null;
  _count?: { projects: number; deals: number; contactPeople: number };
}
const toUIClient = (c: ApiClient): CrmClientRow => ({
  id: c.id, name: c.name, industry: c.industry, email: c.email, phone: c.phone, status: c.status,
  assignee: c.assignee ?? null,
  projectCount: c._count?.projects ?? 0, contactCount: c._count?.contactPeople ?? 0, dealCount: c._count?.deals ?? 0,
});

export interface ClientCreateInput {
  name: string; industry?: string; email?: string; phone?: string; address?: string;
  website?: string; size?: string; status?: "active" | "prospect"; notes?: string; assigneeId?: number;
}
export async function createClient(input: ClientCreateInput): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (res.ok) return { ok: true };
  if (res.status === 409) return { ok: false, message: "לקוח עם שם זה כבר קיים במערכת" };
  const b = await res.json().catch(() => ({}));
  return { ok: false, message: typeof b?.error === "string" ? b.error : "שמירת הלקוח נכשלה" };
}

export async function fetchClients(params: { q?: string; page?: number; limit?: number } = {}): Promise<Page<CrmClientRow>> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 60));
  const res = await fetch(`/api/clients?${qs}`, { cache: "no-store" });
  const body = (await jsonOrThrow(res)) as Page<ApiClient>;
  return { ...body, data: (body.data ?? []).map(toUIClient) };
}

// ── Projects ────────────────────────────────────────────────────────────────
export interface CrmProjectRow {
  id: number; projectNo: number | null; name: string; clientName: string | null; client: Named | null;
  assignee: Named | null; state: string | null; statusText: string | null; methodology: string | null;
  model: string | null; billing: number | null; sourceCreatedAt: string | null; lastUpdated: string | null;
}
interface ApiProject {
  id: number; projectNo: number | null; name: string; clientName: string | null; client: Named | null;
  assignee: Named | null; state: string | null; statusText: string | null; methodology: string | null;
  model: string | null; billing: string | number | null; sourceCreatedAt: string | null; lastUpdated: string | null;
}
const toUIProject = (p: ApiProject): CrmProjectRow => ({
  id: p.id, projectNo: p.projectNo, name: p.name, clientName: p.clientName, client: p.client ?? null,
  assignee: p.assignee ?? null, state: p.state, statusText: p.statusText, methodology: p.methodology,
  model: p.model, billing: p.billing == null ? null : Number(p.billing),
  sourceCreatedAt: p.sourceCreatedAt, lastUpdated: p.lastUpdated,
});

export interface ProjectCreateInput {
  name: string; clientId?: number; assigneeId?: number;
  model?: string; methodology?: string; statusText?: string; billing?: number;
}
export async function createProject(input: ProjectCreateInput): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (res.ok) return { ok: true };
  const b = await res.json().catch(() => ({}));
  return { ok: false, message: typeof b?.error === "string" ? b.error : "שמירת הפרויקט נכשלה" };
}

export async function fetchProjects(params: { q?: string; page?: number; limit?: number } = {}): Promise<Page<CrmProjectRow>> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 60));
  const res = await fetch(`/api/projects?${qs}`, { cache: "no-store" });
  const body = (await jsonOrThrow(res)) as Page<ApiProject>;
  return { ...body, data: (body.data ?? []).map(toUIProject) };
}

async function patchOk(url: string, patch: unknown): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  if (res.ok) return { ok: true };
  const body = await res.json().catch(() => ({}));
  return { ok: false, message: typeof body?.error === "string" ? body.error : "העדכון נכשל" };
}

export interface ClientPatch {
  name?: string; industry?: string | null; email?: string | null; phone?: string | null;
  address?: string | null; website?: string | null; status?: "active" | "prospect"; notes?: string | null; assigneeId?: number;
}
export const updateClient = (id: number, patch: ClientPatch) => patchOk(`/api/clients/${id}`, patch);

export interface ProjectPatch {
  name?: string; clientId?: number | null; assigneeId?: number | null;
  model?: string | null; methodology?: string | null; state?: string | null; statusText?: string | null; billing?: number | null;
}
export const updateProject = (id: number, patch: ProjectPatch) => patchOk(`/api/projects/${id}`, patch);

// ── Deals (pipeline) ────────────────────────────────────────────────────────
export interface CrmDeal {
  id: number; title: string; company: string; value: number; probability: number; health: number;
  stageId: number; pipelineId: number; closeDate: string | null; assignee: Named | null; client: Named | null;
}
interface ApiDeal {
  id: number; title: string; company: string; value: string | number; probability: number; health: number;
  stageId: number; pipelineId: number; closeDate: string | null; assignee: Named | null; client: Named | null;
}
const toUIDeal = (d: ApiDeal): CrmDeal => ({
  id: d.id, title: d.title, company: d.company, value: Number(d.value) || 0, probability: d.probability,
  health: d.health, stageId: d.stageId, pipelineId: d.pipelineId, closeDate: d.closeDate,
  assignee: d.assignee ?? null, client: d.client ?? null,
});

export async function fetchDeals(params: { pipelineId?: number } = {}): Promise<CrmDeal[]> {
  const qs = new URLSearchParams();
  if (params.pipelineId) qs.set("pipelineId", String(params.pipelineId));
  qs.set("limit", "100");
  const res = await fetch(`/api/deals?${qs}`, { cache: "no-store" });
  const body = (await jsonOrThrow(res)) as Page<ApiDeal>;
  return (body.data ?? []).map(toUIDeal);
}

export interface DealInput { title: string; company: string; value: number; probability?: number; pipelineId: number; stageId: number; clientId?: number }
export async function createDeal(input: DealInput): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (res.ok) return { ok: true };
  const b = await res.json().catch(() => ({}));
  return { ok: false, message: typeof b?.error === "string" ? b.error : "שמירת העסקה נכשלה" };
}
export const updateDealStage = (id: number, stageId: number) => patchOk(`/api/deals/${id}`, { stageId });

// ── Contacts ────────────────────────────────────────────────────────────────
export interface CrmContactRow {
  id: number; fullName: string | null; firstName: string | null; email: string | null; mobile: string | null;
  companyName: string | null; category: string | null; status: string | null; newsletter: boolean;
  client: Named | null; accountManager: Named | null;
}
export interface ContactInput {
  fullName: string; firstName?: string | null; email?: string | null; mobile?: string | null;
  companyName?: string | null; category?: string | null; newsletter?: boolean; status?: string | null;
  clientId?: number | null; accountManagerId?: number | null;
}
export async function fetchContacts(params: { q?: string; page?: number; limit?: number } = {}): Promise<Page<CrmContactRow>> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 60));
  const res = await fetch(`/api/contacts?${qs}`, { cache: "no-store" });
  const body = (await jsonOrThrow(res)) as Page<CrmContactRow>;
  return body;
}
export async function createContact(input: ContactInput): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (res.ok) return { ok: true };
  const b = await res.json().catch(() => ({}));
  return { ok: false, message: typeof b?.error === "string" ? b.error : "שמירת איש הקשר נכשלה" };
}
export const updateContact = (id: number, patch: Partial<ContactInput>) => patchOk(`/api/contacts/${id}`, patch);
export async function deleteContact(id: number): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
  if (res.ok) return { ok: true };
  const b = await res.json().catch(() => ({}));
  return { ok: false, message: typeof b?.error === "string" ? b.error : "מחיקת איש הקשר נכשלה" };
}

/** Active users for assignee dropdowns (admin-only endpoint; returns [] if forbidden). */
export async function fetchActiveUsers(): Promise<Named[]> {
  try {
    const us = await fetchUsers();
    return us.filter(u => u.active).map(u => ({ id: u.id, name: u.name }));
  } catch {
    return [];
  }
}
