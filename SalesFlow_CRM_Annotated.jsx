import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
/**
 * ============================================================
 * SalesFlow CRM — Design Mockup (React/JSX)
 * Shiluv I²R · May 2026
 * ============================================================
 *
 * PURPOSE
 * -------
 * This file is the complete UI mockup for the SalesFlow CRM.
 * It is the authoritative source of truth for:
 *   - Data models and field types (see SCHEMA section below)
 *   - Business logic and validation rules
 *   - Role-based access control
 *   - UI flows and component hierarchy
 *
 * TARGET STACK (production)
 * -------------------------
 *   Frontend  : Next.js 14 (App Router), React, Tailwind CSS
 *   Backend   : Next.js API Routes (or Express)
 *   Database  : Microsoft SQL Server (existing server, new DB)
 *   ORM       : Prisma with sqlserver provider
 *   Auth      : NextAuth.js (role: "admin" | "sales_rep")
 *   Deploy    : Docker Compose (app + Next.js only; MSSQL external)
 *   AI        : Anthropic Claude API (claude-sonnet-4)
 *
 * ============================================================
 * DATABASE SCHEMA (Prisma — MSSQL provider)
 * ============================================================
 *
 * Target: Microsoft SQL Server (existing server, new database).
 *
 * PRISMA PROVIDER SETUP
 * ─────────────────────
 * // prisma/schema.prisma
 * datasource db {
 *   provider = "sqlserver"
 *   url      = env("DATABASE_URL")
 * }
 *
 * // .env
 * DATABASE_URL="sqlserver://SERVER_HOST:1433;database=SalesFlowCRM;
 *               user=sa;password=YOUR_PASSWORD;encrypt=true;
 *               trustServerCertificate=true"
 *
 * MSSQL-SPECIFIC NOTES
 * ─────────────────────
 * 1. Use @db.NVarChar(n) for Hebrew text fields (Unicode support).
 *    All String fields storing Hebrew should be NVarChar, not Varchar.
 * 2. Prisma MSSQL does not support @default(dbgenerated("newid()"))
 *    for Int PKs — use @default(autoincrement()) which maps to IDENTITY(1,1).
 * 3. Arrays (tags, activity) → store as NVARCHAR(MAX) JSON strings.
 *    Parse/stringify in application layer. No native array type in MSSQL.
 * 4. Boolean → maps to BIT in MSSQL (0/1). Prisma handles transparently.
 * 5. DateTime → maps to DATETIME2 in MSSQL. Always store UTC, convert in UI.
 * 6. Decimal → use @db.Decimal(18,2) for ILS monetary values.
 * 7. Cascade deletes → declare in Prisma as onDelete: Cascade.
 *    MSSQL enforces these as FK constraints with CASCADE.
 * 8. Schema isolation → all tables in a dedicated schema:
 *    @@schema("salesflow") — or use dbo if preferred.
 * 9. Migrations → run: npx prisma migrate deploy
 *    This creates the DB objects on the existing MSSQL server.
 *    DBA should grant: CREATE TABLE, CREATE INDEX, ALTER TABLE
 *    on the target database (SalesFlowCRM).
 * 10. Connection pooling → use @prisma/adapter-pg is NOT available
 *     for MSSQL. Use default Prisma connection pool. Set
 *     connection_limit in DATABASE_URL if needed:
 *     ...;connection_limit=10
 *
 * DATABASE CREATION (run once, by DBA or admin):
 * ───────────────────────────────────────────────
 * CREATE DATABASE SalesFlowCRM
 *   COLLATE Hebrew_CI_AS;  -- Hebrew-aware collation (case-insensitive)
 * GO
 * CREATE LOGIN salesflow_app WITH PASSWORD = 'StrongPassword!';
 * GO
 * USE SalesFlowCRM;
 * CREATE USER salesflow_app FOR LOGIN salesflow_app;
 * ALTER ROLE db_owner ADD MEMBER salesflow_app;  -- or grant minimal perms
 * GO
 *
 * COLLATION NOTE: Hebrew_CI_AS ensures correct Hebrew sort order and
 * case-insensitive comparison. Set at DB level so all tables inherit it.
 * Alternatively use Hebrew_BIN2 for binary/exact matching.
 *
 * All mock data arrays map 1:1 to MSSQL tables.
 * Field types and constraints are documented per entity below.
 * Prisma model annotations are included for direct use in schema.prisma.
 *
 * TABLE: users                              → MSSQL: [dbo].[users]
 * ────────────
 * id          Int       @id @default(autoincrement())  -- IDENTITY(1,1)
 * name        String    @db.NVarChar(200)   // Full display name (Hebrew)
 * email       String    @unique @db.NVarChar(320)
 * role        String    @db.NVarChar(50)    // "admin" | "sales_rep"
 *                       // UI labels: "מנהל מערכת" | "נציג מכירות"
 * active      Boolean   @default(true)     // BIT in MSSQL
 * joined      DateTime  @default(now())    // DATETIME2
 * lastLogin   DateTime?                    // DATETIME2, nullable
 * leads       Lead[]    @relation("assignee")
 * deals       Deal[]    @relation("assignee")
 * clients     Client[]  @relation("assignee")
 * tasks       Task[]    @relation("assignee")
 * calEvents   CalendarEvent[]
 *
 * TABLE: leads                              → MSSQL: [dbo].[leads]
 * ────────────
 * id          Int       @id @default(autoincrement())
 * name        String    @db.NVarChar(200)   // Contact person name (Hebrew)
 * company     String    @db.NVarChar(200)   // Groups leads in UI (indexed)
 * email       String?   @db.NVarChar(320)
 * phone       String?   @db.NVarChar(30)    // Normalized on ingest (strip dashes/spaces)
 * status      String    @db.NVarChar(20)    // "new"|"contacted"|"qualified"|"disqualified"
 * score       Int       @default(0)         // AI score 0-100, computed server-side
 * value       Decimal   @db.Decimal(18,2)   // ILS monetary value
 * source      String?   @db.NVarChar(50)    // "LinkedIn"|"Web Form"|"Email"|"Meta Ads"|"WhatsApp"|"המלצה"
 * assigneeId  Int       // FK → users.id
 * notes       String?   @db.NVarChar(Max)
 * created     DateTime  @default(now())
 * activity    String?   @db.NVarChar(Max)   // JSON string: [{type,text,time,user}]
 *                                           // No native JSON array in MSSQL — parse in app layer
 * @@index([company])                        // Fast grouping by company in LeadsView
 * @@index([phone])                          // Fast dedup lookup
 * @@index([assigneeId])                     // Fast filter by rep
 *
 * DEDUP RULE (server-side, before INSERT):
 *   SELECT * FROM leads
 *   WHERE phone = @phone               -- normalized: digits only
 *      OR company LIKE @company        -- case-insensitive via Hebrew_CI_AS collation
 *      OR name    LIKE @name
 *   If rows found → return { status: "duplicate", existing: lead }
 *   DBA NOTE: Add full-text index on (company, name) for LIKE performance.
 *
 * TABLE: deals                              → MSSQL: [dbo].[deals]
 * ────────────
 * id          Int       @id @default(autoincrement())
 * title       String    @db.NVarChar(300)
 * company     String    @db.NVarChar(200)   // Denormalized from clients.name
 * clientId    Int?                          // FK → clients.id (nullable, soft link)
 * value       Decimal   @db.Decimal(18,2)
 * probability Int                           // 0-100
 * stage       String    @db.NVarChar(30)    // "lead"|"discovery"|"proposal"|"negotiation"|"closed_won"
 * assigneeId  Int                           // FK → users.id
 * closeDate   DateTime?
 * health      Int       @default(60)        // 0-100 composite score (computed)
 * @@index([stage])
 * @@index([assigneeId])
 *
 TABLE: clients                            → MSSQL: [dbo].[clients]
 * ──────────────
 * id          Int       @id @default(autoincrement())
 * name        String    @unique @db.NVarChar(200)
 * industry    String    @db.NVarChar(50)
 * email       String?   @db.NVarChar(320)
 * phone       String?   @db.NVarChar(30)
 * address     String?   @db.NVarChar(300)
 * website     String?   @db.NVarChar(200)
 * size        String?   @db.NVarChar(20)    // "1-10"|"10-50"|"50-200"|"200+"
 * status      String    @db.NVarChar(20)    // "active"|"prospect"
 * since       DateTime
 * assigneeId  Int                           // FK → users.id
 * notes       String?   @db.NVarChar(Max)
 * contacts    ClientContact[]
 * projects    Project[]
 *
 * TABLE: client_contacts                    → MSSQL: [dbo].[client_contacts]
 * ──────────────────────
 * id          Int       @id @default(autoincrement())
 * clientId    Int                           // FK → clients.id (onDelete: Cascade)
 * name        String    @db.NVarChar(200)
 * role        String?   @db.NVarChar(100)   // Job title
 * email       String?   @db.NVarChar(320)
 * phone       String?   @db.NVarChar(30)
 * main        Boolean   @default(false)     // BIT — primary contact flag
 * lastContact DateTime?
 * deals       Int       @default(0)         // Denormalized — update via trigger or app
 * @@index([clientId])
 *
 * TABLE: projects                           → MSSQL: [dbo].[projects]
 * ───────────────
 * id          Int       @id @default(autoincrement())
 * clientId    Int                           // FK → clients.id
 * contactId   Int?                          // FK → client_contacts.id (nullable)
 * name        String    @db.NVarChar(300)
 * desc        String?   @db.NVarChar(Max)
 * status      String    @db.NVarChar(20)    // "planning"|"active"|"paused"|"completed"
 * priority    String    @db.NVarChar(10)    // "high"|"medium"|"low"
 * budget      Decimal   @db.Decimal(18,2)
 * spent       Decimal   @db.Decimal(18,2)   @default(0)
 * progress    Int       @default(0)         // 0-100
 * startDate   DateTime?
 * endDate     DateTime?
 * assigneeId  Int                           // FK → users.id
 * tags        String?   @db.NVarChar(500)   // JSON string: ["tag1","tag2"]
 *                                           // No array type in MSSQL — parse in app
 * phases      ProjectPhase[]
 * @@index([clientId])
 * @@index([assigneeId])
 *
 * TABLE: project_phases                     → MSSQL: [dbo].[project_phases]
 * ─────────────────────
 * id          Int       @id @default(autoincrement())
 * projectId   Int                           // FK → projects.id (onDelete: Cascade)
 * name        String    @db.NVarChar(200)
 * status      String    @db.NVarChar(20)    // "pending"|"active"|"done"|"blocked"
 * startDate   DateTime?
 * endDate     DateTime?
 * budget      Decimal   @db.Decimal(18,2)   @default(0)
 * spent       Decimal   @db.Decimal(18,2)   @default(0)
 * notes       String?   @db.NVarChar(Max)
 * order       Int       @default(0)         // Display order (sort key)
 * @@index([projectId])
 *
 * TABLE: tasks                              → MSSQL: [dbo].[tasks]
 * ────────────
 * id          Int       @id @default(autoincrement())
 * desc        String    @db.NVarChar(500)
 * type        String    @db.NVarChar(20)    // "call"|"email"|"meeting"|"proposal"|"followup"|"other"
 * priority    String    @db.NVarChar(10)    // "high"|"medium"|"low"
 * date        DateTime                      // DATE — store as DATETIME2, ignore time component
 * time        String?   @db.NVarChar(5)     // "HH:MM" — stored separately for display
 * client      String?   @db.NVarChar(200)   // Free text, not FK
 * notes       String?   @db.NVarChar(Max)
 * status      String    @db.NVarChar(10)    // "open"|"done"
 * assigneeId  Int                           // FK → users.id
 * created     DateTime  @default(now())
 * @@index([assigneeId, status])             // Primary access pattern
 *
 * TABLE: calendar_events                   → MSSQL: [dbo].[calendar_events]
 * ──────────────────────
 * id          Int       @id @default(autoincrement())
 * title       String    @db.NVarChar(400)
 * date        DateTime                      // Store as DATETIME2; use DATE part only
 * time        String?   @db.NVarChar(5)     // "HH:MM"
 * endTime     String?   @db.NVarChar(5)     // "HH:MM"
 * type        String    @db.NVarChar(20)    // "meeting"|"call"|"demo"|"task"|"other"
 * assigneeId  Int                           // FK → users.id
 * client      String?   @db.NVarChar(200)   // Denormalized client name
 * notes       String?   @db.NVarChar(Max)
 * location    String?   @db.NVarChar(300)
 * color       String?   @db.NVarChar(7)     // Hex: "#5B8DEF"
 * gcEventId   String?   @db.NVarChar(200)   // Google Calendar event ID (for bidirectional sync)
 * @@index([assigneeId, date])               // Primary access pattern: my events this week
 *
 * TABLE: automations                       → MSSQL: [dbo].[automations]
 * ──────────────────
 * id          Int       @id @default(autoincrement())
 * name        String    @db.NVarChar(200)
 * trigger     String    @db.NVarChar(300)   // Human-readable trigger description
 * action      String    @db.NVarChar(300)   // Human-readable action description
 * active      Boolean   @default(true)      // BIT
 * runs        Int       @default(0)
 *
 * TABLE: lead_integrations                 → MSSQL: [dbo].[lead_integrations]
 * ──────────────────────────────────────────
 * id           Int      @id @default(autoincrement())
 * sourceId     String   @unique @db.NVarChar(50)  // "website"|"facebook"|"google"|"whatsapp"|custom
 * label        String   @db.NVarChar(100)
 * method       String   @db.NVarChar(20)          // "webhook"|"polling"
 * status       String   @db.NVarChar(20)          // "active"|"inactive"
 * pollInterval String?  @db.NVarChar(50)          // cron expression e.g. every 15 min
 * accessToken  String?  @db.NVarChar(Max)         // AES-256 encrypted at app layer
 * webhookUrl   String?  @db.NVarChar(500)
 * fieldMapping String?  @db.NVarChar(Max)         // JSON string: {"full_name":"name"}
 * totalLeads   Int      @default(0)
 * todayLeads   Int      @default(0)               // Reset daily via scheduled job
 *
 * ============================================================
 * RELATIONSHIPS (ERD summary)
 * ============================================================
 *
 *  users ──< leads          (one user → many leads via assignee)
 *  users ──< deals          (one user → many deals via assignee)
 *  users ──< clients        (one user → many clients via assignee)
 *  users ──< tasks
 *  users ──< calendar_events
 *
 *  clients ──< client_contacts  (cascade delete)
 *  clients ──< projects
 *  projects ──< project_phases  (cascade delete)
 *
 *  leads.company ~~> clients.name  (soft link — not FK, for flexibility)
 *  deals.company ~~> clients.name  (soft link — not FK)
 *
 * ============================================================
 * ROLE-BASED ACCESS CONTROL
 * ============================================================
 *
 *  role: "admin" (מנהל מערכת)
 *    - Sees ALL records regardless of assignee
 *    - Can assign/reassign any record to any user
 *    - Access to: Users, Automations, Integrations, Import
 *    - Can impersonate any user (see their filtered view)
 *
 *  role: "sales_rep" (נציג מכירות)
 *    - Sees ONLY records where assignee = self
 *    - Filter applied server-side: WHERE assigneeId = @userId
 *      (Prisma: where: { assigneeId: session.user.id })
 *    - No access to: Users, Automations, Integrations, Import
 *
 *  Impersonation (admin only):
 *    - Admin selects "צפה כ" on any user
 *    - All data filters switch to that user's assigneeId
 *    - Banner shown: "אתה צופה כ: [name]"
 *    - No data modifications allowed while impersonating
 *
 * ============================================================
 * EXTERNAL INTEGRATIONS
 * ============================================================
 *
 *  Lead Sources (all route through POST /api/leads):
 *    - Website:   Inbound webhook from HTML form embed
 *    - Facebook:  Meta Lead Ads API — polling every N minutes
 *    - Google:    Google Ads Lead Form Extensions API — polling
 *    - WhatsApp:  WhatsApp Business API webhook
 *
 *  Dedup on ingest (server-side):
 *    1. Normalize phone: strip spaces, dashes, country code
 *    2. Check: SELECT TOP 1 * FROM leads
 *              WHERE phone = @phone
 *                 OR company LIKE @company   -- Hebrew_CI_AS handles case
 *                 OR name    LIKE @name
 *    3. If found: return { status: "duplicate", existing: lead } — do not insert
 *    4. If not found: insert and return { status: "created", lead }
 *
 *  Calendar:
 *    - Google Calendar: OAuth2 + Google Calendar API v3
 *    - Bidirectional sync via push channels (webhooks)
 *    - Events linked to CRM via gcEventId field
 *    - Each user syncs their own calendar
 *    - Admin can view all users' calendars
 *
 *  AI (Anthropic Claude):
 *    - Model: claude-sonnet-4-20250514
 *    - Used for: lead scoring, email drafting, CRM Q&A
 *    - Context injected per request: pipeline stats, team data
 *    - API key stored server-side only (never exposed to client)
 *    - Route: POST /api/ai/chat
 *
 * ============================================================
 * MODULES / VIEWS (13 total)
 * ============================================================
 *  dashboard      — KPI cards, revenue chart, funnel, team perf
 *  leads          — Company-grouped leads, dedup, detail panel
 *  pipeline       — Kanban drag-and-drop by deal stage
 *  clients        — Client cards + contact hierarchy
 *  projects       — Project list + phase timeline + financials
 *  contacts       — Client-grouped contact hierarchy
 *  analytics      — Charts, team performance, deal table
 *  automations    — When→Then rules with toggle
 *  calendar       — Day/Month/Year views + Google Calendar sync
 *  tasks          — Task manager with priority/due date filters
 *  integrations   — Lead source config, field mapping, ingestion log
 *  import         — CSV/Excel import wizard (4-step)
 *  users          — User management + impersonation (admin only)
 *  ai             — Claude-powered CRM assistant chat
 *
 * ============================================================
 */


// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const NAVY = "#0F1B35";
const GOLD = "#C9A84C";
const GOLD_L = "#F5EDD3";
const BLUE = "#1E3A6E";
const SURF = "#F7F6F3";
const WHITE = "#FFFFFF";
const MUTED = "#8A9BBE";
const TEXT = "#1A2540";
const BORDER = "#E2DDD5";
const OK = "#1E8C5A";
const WARN = "#D48B1A";
const ERR = "#C0392B";

// ─── INITIAL DATA ────────────────────────────────────────────────────────────
const initLeads = [
  { id: 1, name: "אבי לוי", company: "טק-ויז'ן", email: "avi@tv.co.il", phone: "052-1234567", status: "new", score: 87, value: 45000, source: "LinkedIn", assignee: "מיכל כהן" },
  { id: 2, name: "שרה מזרחי", company: "אינוביט", email: "sara@inv.co.il", phone: "054-9876543", status: "contacted", score: 72, value: 28000, source: "Web Form", assignee: "ירון לוי" },
  { id: 3, name: "דוד ברקוביץ", company: "FinanceHub", email: "david@fh.co.il", phone: "050-5554433", status: "qualified", score: 94, value: 120000, source: "Email", assignee: "מיכל כהן" },
  { id: 4, name: "רותם שמיר", company: "StartupX", email: "rotem@sx.io", phone: "053-3332211", status: "new", score: 61, value: 15000, source: "Meta Ads", assignee: "אייל נחמני" },
  { id: 5, name: "נועה פרץ", company: "MediCore", email: "noa@mc.co.il", phone: "058-7778899", status: "disqualified", score: 35, value: 8000, source: "WhatsApp", assignee: "ירון לוי" },
  { id: 6, name: "גיל אבן", company: "AutoTech", email: "gil@at.co.il", phone: "052-6665544", status: "contacted", score: 79, value: 67000, source: "LinkedIn", assignee: "אייל נחמני" },
];

const initDeals = [
  { id: 1, title: "חבילת ארגוני", company: "טק-ויז'ן", value: 120000, probability: 75, stage: "proposal", assignee: "מיכל כהן", closeDate: "2026-05-30", health: 85 },
  { id: 2, title: "SaaS שנתי", company: "FinanceHub", value: 84000, probability: 90, stage: "negotiation", assignee: "ירון לוי", closeDate: "2026-05-15", health: 92 },
  { id: 3, title: "פיילוט SMB", company: "StartupX", value: 18000, probability: 40, stage: "discovery", assignee: "אייל נחמני", closeDate: "2026-06-10", health: 55 },
  { id: 4, title: "הסכם תמיכה", company: "MediCore", value: 240000, probability: 60, stage: "proposal", assignee: "מיכל כהן", closeDate: "2026-06-30", health: 70 },
  { id: 5, title: "Enterprise License", company: "AutoTech", value: 67000, probability: 85, stage: "closed_won", assignee: "ירון לוי", closeDate: "2026-04-25", health: 100 },
  { id: 6, title: "שדרוג Pro", company: "אינוביט", value: 36000, probability: 55, stage: "discovery", assignee: "אייל נחמני", closeDate: "2026-07-01", health: 63 },
  { id: 7, title: "חוזה Enterprise", company: "GlobalTech", value: 310000, probability: 30, stage: "lead", assignee: "מיכל כהן", closeDate: "2026-08-15", health: 40 },
];

const initContacts = [
  { id: 1, name: "אבי לוי", title: "CTO", company: "טק-ויז'ן", email: "avi@tv.co.il", phone: "052-1234567", lastContact: "2026-04-22", deals: 2, notes: "לקוח VIP, מעדיף פגישות בוקר" },
  { id: 2, name: "שרה מזרחי", title: "VP Marketing", company: "אינוביט", email: "sara@inv.co.il", phone: "054-9876543", lastContact: "2026-04-20", deals: 1, notes: "מתעניינת בפתרון Enterprise" },
  { id: 3, name: "דוד ברקוביץ", title: "CEO", company: "FinanceHub", email: "david@fh.co.il", phone: "050-5554433", lastContact: "2026-04-21", deals: 3, notes: "מקבל החלטות מהיר" },
  { id: 4, name: "רותם שמיר", title: "Head of Sales", company: "StartupX", email: "rotem@sx.io", phone: "053-3332211", lastContact: "2026-04-18", deals: 1, notes: "בשלבי תקצוב — לחזור ביוני" },
  { id: 5, name: "גיל אבן", title: "CFO", company: "AutoTech", email: "gil@at.co.il", phone: "052-6665544", lastContact: "2026-04-23", deals: 1, notes: "מתמקד ב-ROI" },
];

const initClients = [
  { id: 101, name: "טק-ויז'ן", industry: "טכנולוגיה", email: "info@tv.co.il", phone: "03-1234567", address: "תל אביב", website: "tv.co.il", size: "50-200", status: "active", since: "2024-01-10", assignee: "מיכל כהן", notes: "לקוח VIP" },
  { id: 102, name: "FinanceHub", industry: "פיננסים", email: "contact@fh.co.il", phone: "03-9876543", address: "רמת גן", website: "financehub.co.il", size: "200+", status: "active", since: "2024-03-15", assignee: "ירון לוי", notes: "מגדיל תקציב כל שנה" },
  { id: 103, name: "אינוביט", industry: "שיווק", email: "hello@inv.co.il", phone: "03-5554433", address: "הרצליה", website: "innovit.co.il", size: "10-50", status: "active", since: "2025-01-20", assignee: "ירון לוי", notes: "רגיש למחיר" },
  { id: 104, name: "AutoTech", industry: "רכב", email: "info@at.co.il", phone: "03-7778899", address: "חיפה", website: "autotech.co.il", size: "50-200", status: "active", since: "2023-06-01", assignee: "ירון לוי", notes: "עסקה נסגרה החודש" },
  { id: 105, name: "MediCore", industry: "בריאות", email: "info@mc.co.il", phone: "03-3332211", address: "ירושלים", website: "medicore.co.il", size: "200+", status: "prospect", since: "2025-11-01", assignee: "מיכל כהן", notes: "בשלבי הצעת מחיר" },
];

const initClientContacts = [
  { id: 1001, clientId: 101, name: "אבי לוי", role: "CTO", email: "avi@tv.co.il", phone: "052-1234567", main: true },
  { id: 1002, clientId: 101, name: "ריקי כהן", role: "CEO", email: "riki@tv.co.il", phone: "054-1111222", main: false },
  { id: 1003, clientId: 102, name: "דוד ברקוביץ", role: "CEO", email: "david@fh.co.il", phone: "050-5554433", main: true },
  { id: 1004, clientId: 103, name: "שרה מזרחי", role: "VP Marketing", email: "sara@inv.co.il", phone: "054-9876543", main: true },
  { id: 1005, clientId: 104, name: "גיל אבן", role: "CFO", email: "gil@at.co.il", phone: "052-6665544", main: true },
  { id: 1006, clientId: 105, name: "נועה פרץ", role: "VP Operations", email: "noa@mc.co.il", phone: "058-7778899", main: true },
];

const initProjects = [
  {
    id: 1, clientId: 101, name: "הטמעת CRM", desc: "הטמעה מלאה של מערכת SalesFlow בארגון, כולל הדרכות וחיבור לממשקים קיימים",
    status: "active", priority: "high", budget: 80000, spent: 35000, progress: 45,
    startDate: "2026-03-01", endDate: "2026-07-31", assignee: "מיכל כהן", tags: ["CRM", "טכנולוגיה"],
    contactId: 1001,
    phases: [
      { id: 1, name: "ניתוח דרישות", status: "done", startDate: "2026-03-01", endDate: "2026-03-15", budget: 8000, spent: 7500, notes: "הושלם — 3 פגישות, מסמך דרישות מאושר" },
      { id: 2, name: "עיצוב ואדריכלות", status: "done", startDate: "2026-03-16", endDate: "2026-04-05", budget: 15000, spent: 14200, notes: "מסמך אדריכלות מאושר על ידי הלקוח" },
      { id: 3, name: "פיתוח ורכיבים", status: "active", startDate: "2026-04-06", endDate: "2026-06-15", budget: 40000, spent: 13300, notes: "בעבודה — 60% מהפיצ'רים הושלמו" },
      { id: 4, name: "בדיקות ו-QA", status: "pending", startDate: "2026-06-16", endDate: "2026-07-10", budget: 10000, spent: 0, notes: "" },
      { id: 5, name: "השקה והדרכות", status: "pending", startDate: "2026-07-11", endDate: "2026-07-31", budget: 7000, spent: 0, notes: "" },
    ],
  },
  {
    id: 2, clientId: 102, name: "אינטגרציה ERP", desc: "חיבור מערכת ERP קיימת לממשקי API חיצוניים ולמערכת הנהלת החשבונות",
    status: "planning", priority: "medium", budget: 120000, spent: 0, progress: 10,
    startDate: "2026-05-01", endDate: "2026-10-31", assignee: "ירון לוי", tags: ["ERP", "אינטגרציה"],
    contactId: 1003,
    phases: [
      { id: 1, name: "מיפוי תהליכים", status: "active", startDate: "2026-05-01", endDate: "2026-05-20", budget: 12000, spent: 0, notes: "מתחיל ב-1 במאי" },
      { id: 2, name: "פיתוח API", status: "pending", startDate: "2026-05-21", endDate: "2026-07-31", budget: 55000, spent: 0, notes: "" },
      { id: 3, name: "אינטגרציה ובדיקות", status: "pending", startDate: "2026-08-01", endDate: "2026-09-30", budget: 35000, spent: 0, notes: "" },
      { id: 4, name: "Go-Live", status: "pending", startDate: "2026-10-01", endDate: "2026-10-31", budget: 18000, spent: 0, notes: "" },
    ],
  },
  {
    id: 3, clientId: 104, name: "אוטומציה שיווקית", desc: "פרויקט אוטומציה שיווקית מקיף — email flows, landing pages, CRM sync",
    status: "completed", priority: "low", budget: 45000, spent: 44000, progress: 100,
    startDate: "2026-01-01", endDate: "2026-04-30", assignee: "אייל נחמני", tags: ["שיווק"],
    contactId: 1005,
    phases: [
      { id: 1, name: "אפיון ואסטרטגיה", status: "done", startDate: "2026-01-01", endDate: "2026-01-20", budget: 8000, spent: 8000, notes: "הושלם בזמן" },
      { id: 2, name: "בניית תהליכי אוטומציה", status: "done", startDate: "2026-01-21", endDate: "2026-03-15", budget: 25000, spent: 24500, notes: "12 flows הוקמו" },
      { id: 3, name: "בדיקות ואופטימיזציה", status: "done", startDate: "2026-03-16", endDate: "2026-04-15", budget: 8000, spent: 8200, notes: "חריגה קטנה אושרה" },
      { id: 4, name: "הסגרה ותיעוד", status: "done", startDate: "2026-04-16", endDate: "2026-04-30", budget: 4000, spent: 3300, notes: "מסמך תפעולי נמסר ללקוח" },
    ],
  },
];

const initUsers = [
  { id: 1, name: "מיכל כהן", email: "michal@shiluv.co.il", role: "מנהל מערכת", active: true, joined: "2024-01-01", lastLogin: "2026-04-30" },
  { id: 2, name: "ירון לוי", email: "yaron@shiluv.co.il", role: "נציג מכירות", active: true, joined: "2024-03-15", lastLogin: "2026-04-29" },
  { id: 3, name: "אייל נחמני", email: "eyal@shiluv.co.il", role: "נציג מכירות", active: true, joined: "2024-06-01", lastLogin: "2026-04-28" },
];

const initCalendarEvents = [
  { id: 1, title: "פגישת היכרות — טק-ויז'ן", date: "2026-05-04", time: "09:00", endTime: "10:00", type: "meeting", assignee: "מיכל כהן", client: "טק-ויז'ן", color: "#5B8DEF", notes: "להכין מצגת פתרון", location: "משרד הלקוח, תל אביב" },
  { id: 2, title: "שיחת מעקב — FinanceHub", date: "2026-05-04", time: "14:00", endTime: "14:30", type: "call", assignee: "ירון לוי", client: "FinanceHub", color: OK, notes: "לעדכן על הצעת המחיר", location: "" },
  { id: 3, title: "הדגמת מוצר — StartupX", date: "2026-05-05", time: "11:00", endTime: "12:30", type: "demo", assignee: "אייל נחמני", client: "StartupX", color: GOLD, notes: "דמו של מודול הלידים", location: "Zoom" },
  { id: 4, title: "סקירת חוזה — MediCore", date: "2026-05-06", time: "10:00", endTime: "11:00", type: "meeting", assignee: "מיכל כהן", client: "MediCore", color: "#5B8DEF", notes: "", location: "משרד Shiluv" },
  { id: 5, title: "קיקאוף פרויקט CRM", date: "2026-05-07", time: "09:00", endTime: "11:00", type: "meeting", assignee: "מיכל כהן", client: "טק-ויז'ן", color: "#5B8DEF", notes: "כל הצוות נוכח", location: "חדר ישיבות A" },
  { id: 6, title: "שיחת מכירה — AutoTech", date: "2026-05-07", time: "13:00", endTime: "13:30", type: "call", assignee: "ירון לוי", client: "AutoTech", color: OK, notes: "", location: "" },
  { id: 7, title: "תזכורת: שליחת הצעת מחיר", date: "2026-05-08", time: "09:00", endTime: "09:30", type: "task", assignee: "אייל נחמני", client: "אינוביט", color: WARN, notes: "לשלוח עד סוף היום", location: "" },
  { id: 8, title: "פגישת תכנון רבעון Q3", date: "2026-05-11", time: "15:00", endTime: "16:30", type: "meeting", assignee: "מיכל כהן", client: "", color: "#5B8DEF", notes: "כל הצוות", location: "חדר ישיבות B" },
  { id: 9, title: "הדרכת משתמשים — FinanceHub", date: "2026-05-12", time: "10:00", endTime: "12:00", type: "demo", assignee: "ירון לוי", client: "FinanceHub", color: GOLD, notes: "5 משתתפים", location: "Zoom" },
  { id: 10, title: "Review חוזה שנתי", date: "2026-05-14", time: "11:00", endTime: "12:00", type: "meeting", assignee: "מיכל כהן", client: "AutoTech", color: "#5B8DEF", notes: "", location: "טלפון" },
  { id: 11, title: "Follow-up — StartupX", date: "2026-05-15", time: "14:00", endTime: "14:30", type: "call", assignee: "אייל נחמני", client: "StartupX", color: OK, notes: "", location: "" },
  { id: 12, title: "הצגת ROI — MediCore", date: "2026-05-19", time: "10:00", endTime: "11:30", type: "meeting", assignee: "מיכל כהן", client: "MediCore", color: "#5B8DEF", notes: "להכין דוח ROI", location: "משרד הלקוח" },
];

const initTasks = [];

// ─── CALENDAR VIEW ────────────────────────────────────────────────────────────

const EVENT_TYPES = {
  meeting: { label: "פגישה", color: "#5B8DEF" },
  call:    { label: "שיחה",  color: OK },
  demo:    { label: "דמו",   color: GOLD },
  task:    { label: "משימה", color: WARN },
  other:   { label: "אחר",   color: MUTED },
};

const HE_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const HE_DAYS   = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
const HE_DAYS_FULL = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];

function CalendarView({ events, setEvents, activeUser, isAdminView }) {
  const today = new Date(2026, 4, 3); // May 3 2026
  const [viewMode, setViewMode]   = useState("month");
  const [curDate,  setCurDate]    = useState(today);
  const [selEvent, setSelEvent]   = useState(null);
  const [addModal, setAddModal]   = useState(false);
  const [gcModal,  setGcModal]    = useState(false);
  const [gcConnected, setGcConn]  = useState(false);
  const [filterUser, setFilterUser] = useState("all");

  const emptyForm = { title: "", date: "2026-05-10", time: "09:00", endTime: "10:00", type: "meeting", assignee: activeUser?.name || "מיכל כהן", client: "", notes: "", location: "" };
  const [form, setForm] = useState(emptyForm);

  // Filter events by user (admin sees all, rep sees own)
  const visibleEvents = events.filter(ev => {
    const userMatch = isAdminView
      ? (filterUser === "all" || ev.assignee === filterUser)
      : ev.assignee === activeUser?.name;
    return userMatch;
  });

  const saveEvent = () => {
    if (!form.title || !form.date) { alert("כותרת ותאריך הם שדות חובה"); return; }
    const color = EVENT_TYPES[form.type]?.color || MUTED;
    setEvents(p => [...p, { ...form, id: Date.now(), color }]);
    setAddModal(false);
    setForm(emptyForm);
  };

  const deleteEvent = (id) => { setEvents(p => p.filter(e => e.id !== id)); setSelEvent(null); };

  // Navigation helpers
  const navigate = (dir) => {
    const d = new Date(curDate);
    if (viewMode === "day")   d.setDate(d.getDate() + dir);
    if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    if (viewMode === "year")  d.setFullYear(d.getFullYear() + dir);
    setCurDate(d);
  };

  const headerTitle = () => {
    if (viewMode === "day")   return HE_DAYS_FULL[curDate.getDay()] + ", " + curDate.getDate() + " ב" + HE_MONTHS[curDate.getMonth()] + " " + curDate.getFullYear();
    if (viewMode === "month") return HE_MONTHS[curDate.getMonth()] + " " + curDate.getFullYear();
    if (viewMode === "year")  return String(curDate.getFullYear());
  };

  const isoDate = (d) => d.toISOString().slice(0, 10);

  const eventsOn = (dateStr) => visibleEvents.filter(e => e.date === dateStr).sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  // ── Event detail modal ──
  const EventModal = () => {
    if (!selEvent) return null;
    const ev = selEvent;
    return (
      <Modal title={ev.title} onClose={() => setSelEvent(null)} width={440}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 10, background: EVENT_TYPES[ev.type]?.color + "22", color: EVENT_TYPES[ev.type]?.color }}>{EVENT_TYPES[ev.type]?.label}</span>
            {ev.client && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, background: SURF, color: TEXT }}>{ev.client}</span>}
          </div>
          {[
            ["📅 תאריך", ev.date + (ev.time ? "  " + ev.time + (ev.endTime ? " – " + ev.endTime : "") : "")],
            ["👤 נציג", ev.assignee],
            ev.location && ["📍 מיקום", ev.location],
            ev.notes && ["📝 הערות", ev.notes],
          ].filter(Boolean).map(([label, val]) => (
            <div key={label} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8, fontSize: 12 }}>
              <span style={{ color: MUTED }}>{label}</span>
              <span style={{ color: TEXT, fontWeight: 600 }}>{val}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <Btn onClick={() => deleteEvent(ev.id)} variant="danger" sm>🗑 מחק</Btn>
            <Btn onClick={() => setSelEvent(null)} variant="secondary" sm>סגור</Btn>
          </div>
        </div>
      </Modal>
    );
  };

  // ── Add event modal ──
  const AddModal = () => (
    <Modal title="+ אירוע חדש" onClose={() => setAddModal(false)} width={500}>
      <FormRow>
        <Field label="כותרת *"><Input value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="שם האירוע" style={{ width: "100%" }} /></Field>
        <Field label="סוג">
          <Select value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} options={Object.entries(EVENT_TYPES).map(([k, t]) => ({ value: k, label: t.label }))} style={{ width: "100%" }} />
        </Field>
      </FormRow>
      <FormRow>
        <Field label="תאריך *"><Input value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} type="date" style={{ width: "100%" }} /></Field>
        <Field label="שעת התחלה"><Input value={form.time} onChange={v => setForm(p => ({ ...p, time: v }))} type="time" style={{ width: "100%" }} /></Field>
        <Field label="שעת סיום"><Input value={form.endTime} onChange={v => setForm(p => ({ ...p, endTime: v }))} type="time" style={{ width: "100%" }} /></Field>
      </FormRow>
      <FormRow>
        <Field label="לקוח"><Input value={form.client} onChange={v => setForm(p => ({ ...p, client: v }))} placeholder="שם הלקוח" style={{ width: "100%" }} /></Field>
        <Field label="נציג">
          <Select value={form.assignee} onChange={v => setForm(p => ({ ...p, assignee: v }))} options={["מיכל כהן", "ירון לוי", "אייל נחמני"].map(x => ({ value: x, label: x }))} style={{ width: "100%" }} />
        </Field>
      </FormRow>
      <div style={{ marginBottom: 10 }}><Field label="מיקום"><Input value={form.location} onChange={v => setForm(p => ({ ...p, location: v }))} placeholder="כתובת / Zoom / טלפון" style={{ width: "100%" }} /></Field></div>
      <div style={{ marginBottom: 12 }}><Field label="הערות"><Input value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} placeholder="הערות נוספות..." style={{ width: "100%" }} /></Field></div>
      <div style={{ display: "flex", gap: 8 }}><Btn onClick={saveEvent}>✓ שמור אירוע</Btn><Btn onClick={() => setAddModal(false)} variant="secondary">ביטול</Btn></div>
    </Modal>
  );

  // ── Google Calendar modal ──
  const GcModal = () => (
    <Modal title="🔗 חיבור Google Calendar" onClose={() => setGcModal(false)} width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: gcConnected ? "#EAF3DE" : SURF, border: `1px solid ${gcConnected ? OK : BORDER}`, borderRadius: 9, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24 }}>📅</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>Google Calendar</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{gcConnected ? "מחובר — מסנכרן כל 15 דקות" : "לא מחובר"}</div>
          </div>
          {gcConnected
            ? <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: "#EAF3DE", color: OK }}>✓ פעיל</span>
            : <Btn onClick={() => { setGcConn(true); }} variant="primary" sm>חבר עכשיו</Btn>}
        </div>

        {gcConnected && (
          <div style={{ background: SURF, borderRadius: 8, padding: 12, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: TEXT, marginBottom: 8 }}>הגדרות סנכרון</div>
            {[["כיוון סנכרון", "דו-כיווני (push & pull)"], ["תדירות", "כל 15 דקות"], ["יומן מקושר", "SalesFlow CRM · Shiluv"], ["לשייך לנציג לפי", "אימייל Google"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ color: MUTED }}>{k}</span>
                <span style={{ color: TEXT, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: SURF, borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: TEXT, marginBottom: 8 }}>אינטגרציות יומן נוספות</div>
          {[
            { name: "Outlook / Microsoft 365", icon: "📘", status: "זמין" },
            { name: "Apple Calendar (iCal)", icon: "🍎", status: "זמין" },
            { name: "Calendly", icon: "🗓", status: "בקרוב" },
          ].map(s => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "8px 10px", background: WHITE, borderRadius: 7, border: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
              <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: TEXT }}>{s.name}</div>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: s.status === "בקרוב" ? SURF : "#E6F1FB", color: s.status === "בקרוב" ? MUTED : BLUE, fontWeight: 600 }}>{s.status}</span>
              {s.status === "זמין" && <Btn variant="secondary" sm onClick={() => {}}>חבר</Btn>}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: MUTED, background: "#FAEEDA", borderRadius: 7, padding: 10 }}>
          💡 בגרסה הייצורית: OAuth2 עם Google API, sync דו-כיווני בזמן אמת. כאן זוהי הדגמה ויזואלית של הממשק.
        </div>
      </div>
    </Modal>
  );

  // ── Event chip (used in month/day views) ──
  const EventChip = ({ ev, compact = false }) => (
    <div onClick={e => { e.stopPropagation(); setSelEvent(ev); }}
      style={{ background: ev.color + "22", borderRight: `3px solid ${ev.color}`, borderRadius: 4, padding: compact ? "2px 5px" : "3px 7px", marginBottom: 2, cursor: "pointer", fontSize: compact ? 10 : 11, color: TEXT, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      onMouseEnter={e => e.currentTarget.style.background = ev.color + "44"}
      onMouseLeave={e => e.currentTarget.style.background = ev.color + "22"}>
      {ev.time && <span style={{ color: ev.color, marginLeft: 4 }}>{ev.time}</span>}
      {ev.title}
    </div>
  );

  // ── MONTH VIEW ──
  const MonthView = () => {
    const year = curDate.getFullYear(), month = curDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${BORDER}` }}>
          {HE_DAYS.map(d => <div key={d} style={{ padding: "8px 0", textAlign: "center", fontSize: 11, fontWeight: 700, color: MUTED }}>{d}</div>)}
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridAutoRows: "1fr", overflow: "hidden" }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={"e" + idx} style={{ borderLeft: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: SURF }} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvs = eventsOn(dateStr);
            const isToday = isoDate(today) === dateStr;
            const isSel   = isoDate(curDate) === dateStr;
            return (
              <div key={day} onClick={() => { setCurDate(new Date(year, month, day)); setViewMode("day"); }}
                style={{ borderLeft: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: "4px 5px", overflow: "hidden", cursor: "pointer", background: isToday ? "#F0F4FF" : WHITE }}
                onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = SURF; }}
                onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = WHITE; }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 500, color: isToday ? BLUE : TEXT, marginBottom: 2, width: 20, height: 20, borderRadius: "50%", background: isToday ? BLUE : "transparent", color: isToday ? WHITE : TEXT, display: "flex", alignItems: "center", justifyContent: "center" }}>{day}</div>
                {dayEvs.slice(0, 2).map(ev => <EventChip key={ev.id} ev={ev} compact />)}
                {dayEvs.length > 2 && <div style={{ fontSize: 9, color: MUTED, fontWeight: 600 }}>+{dayEvs.length - 2} נוספים</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── DAY VIEW ──
  const DayView = () => {
    const dateStr = isoDate(curDate);
    const dayEvs  = eventsOn(dateStr);
    const hours   = Array.from({ length: 12 }, (_, i) => i + 8); // 08:00–19:00
    return (
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", borderTop: `1px solid ${BORDER}` }}>
          {hours.map(h => {
            const hStr = String(h).padStart(2, "0") + ":00";
            const slotEvs = dayEvs.filter(ev => ev.time && ev.time.startsWith(String(h).padStart(2, "0")));
            return (
              <React.Fragment key={h}>
                <div style={{ padding: "10px 6px", borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}`, textAlign: "left", fontSize: 10, color: MUTED, fontWeight: 600 }}>{hStr}</div>
                <div style={{ padding: 4, borderBottom: `1px solid ${BORDER}`, minHeight: 44, background: slotEvs.length ? WHITE : h % 2 === 0 ? WHITE : SURF + "88" }}>
                  {slotEvs.map(ev => (
                    <div key={ev.id} onClick={() => setSelEvent(ev)}
                      style={{ background: ev.color + "22", border: `1px solid ${ev.color}`, borderRight: `4px solid ${ev.color}`, borderRadius: 6, padding: "5px 10px", marginBottom: 3, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      onMouseEnter={e => e.currentTarget.style.background = ev.color + "44"}
                      onMouseLeave={e => e.currentTarget.style.background = ev.color + "22"}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{ev.title}</div>
                        <div style={{ fontSize: 10, color: MUTED }}>{ev.time}{ev.endTime ? " – " + ev.endTime : ""}{ev.client ? " · " + ev.client : ""}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Av name={ev.assignee} size={22} color={NAVY} />
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 8, background: ev.color + "22", color: ev.color }}>{EVENT_TYPES[ev.type]?.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        {dayEvs.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: MUTED, fontSize: 12 }}>
            אין אירועים ביום זה<br />
            <button onClick={() => { setForm(f => ({ ...f, date: dateStr })); setAddModal(true); }} style={{ marginTop: 10, background: NAVY, color: WHITE, border: "none", borderRadius: 7, padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ הוסף אירוע</button>
          </div>
        )}
      </div>
    );
  };

  // ── YEAR VIEW ──
  const YearView = () => {
    const year = curDate.getFullYear();
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {Array.from({ length: 12 }, (_, m) => {
            const monthEvs = visibleEvents.filter(e => e.date.startsWith(`${year}-${String(m + 1).padStart(2, "0")}`));
            const isCurrentMonth = m === today.getMonth() && year === today.getFullYear();
            return (
              <div key={m} onClick={() => { setCurDate(new Date(year, m, 1)); setViewMode("month"); }}
                style={{ background: isCurrentMonth ? "#F0F4FF" : WHITE, border: `1px solid ${isCurrentMonth ? BLUE : BORDER}`, borderRadius: 9, padding: 12, cursor: "pointer" }}
                onMouseEnter={e => { if (!isCurrentMonth) e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.06)"; }}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <div style={{ fontWeight: 700, fontSize: 12, color: isCurrentMonth ? BLUE : TEXT, marginBottom: 8 }}>{HE_MONTHS[m]}</div>
                {monthEvs.length === 0
                  ? <div style={{ fontSize: 10, color: MUTED }}>ללא אירועים</div>
                  : monthEvs.slice(0, 3).map(ev => (
                    <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: ev.color, flexShrink: 0 }} />
                      <div style={{ fontSize: 10, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                    </div>
                  ))
                }
                {monthEvs.length > 3 && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>+{monthEvs.length - 3} נוספים</div>}
                <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: monthEvs.length > 0 ? BLUE : MUTED }}>{monthEvs.length} אירועים</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const ASSIGNEES = ["מיכל כהן", "ירון לוי", "אייל נחמני"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {selEvent && <EventModal />}
      {addModal && <AddModal />}
      {gcModal  && <GcModal  />}

      {/* Toolbar */}
      <div style={{ padding: "10px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: WHITE }}>
        {/* Nav arrows */}
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => navigate(-1)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", fontSize: 13 }}>‹</button>
          <button onClick={() => setCurDate(today)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>היום</button>
          <button onClick={() => navigate(1)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", fontSize: 13 }}>›</button>
        </div>

        <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, flex: 1 }}>{headerTitle()}</div>

        {/* Admin user filter */}
        {isAdminView && (
          <Select value={filterUser} onChange={setFilterUser}
            options={[{ value: "all", label: "כל הנציגים" }, ...ASSIGNEES.map(a => ({ value: a, label: a }))]}
            style={{ width: 150 }} />
        )}

        {/* View mode */}
        <div style={{ display: "flex", border: `1px solid ${BORDER}`, borderRadius: 7, overflow: "hidden" }}>
          {[["day", "יום"], ["month", "חודש"], ["year", "שנה"]].map(([v, l]) => (
            <button key={v} onClick={() => setViewMode(v)}
              style={{ padding: "6px 13px", border: "none", background: viewMode === v ? NAVY : WHITE, color: viewMode === v ? WHITE : TEXT, fontSize: 11, fontWeight: viewMode === v ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
          ))}
        </div>

        <Btn onClick={() => setAddModal(true)}>+ אירוע</Btn>
        <button onClick={() => setGcModal(true)}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: `1px solid ${gcConnected ? OK : BORDER}`, borderRadius: 7, background: gcConnected ? "#EAF3DE" : WHITE, cursor: "pointer", fontSize: 11, fontWeight: 600, color: gcConnected ? OK : TEXT, fontFamily: "inherit" }}>
          📅 {gcConnected ? "מחובר" : "חבר Google"}
        </button>
      </div>

      {/* Upcoming strip for day view */}
      {viewMode !== "year" && (
        <div style={{ padding: "6px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 8, overflowX: "auto", flexShrink: 0, background: SURF }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(curDate);
            if (viewMode === "month") d.setDate(1);
            d.setDate(d.getDate() + i - (viewMode === "month" ? 0 : 0));
            const ds = isoDate(d);
            const cnt = eventsOn(ds).length;
            const isActive = isoDate(curDate) === ds;
            return (
              <button key={i} onClick={() => { setCurDate(d); setViewMode("day"); }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "5px 10px", borderRadius: 8, border: `1px solid ${isActive ? NAVY : "transparent"}`, background: isActive ? NAVY : "transparent", cursor: "pointer", minWidth: 46 }}>
                <div style={{ fontSize: 10, color: isActive ? WHITE : MUTED }}>{HE_DAYS[d.getDay()]}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? WHITE : TEXT }}>{d.getDate()}</div>
                {cnt > 0 && <div style={{ width: 5, height: 5, borderRadius: "50%", background: isActive ? GOLD : BLUE, marginTop: 2 }} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Main calendar area */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: viewMode === "year" ? "12px 20px 0" : 0 }}>
        {viewMode === "month" && <MonthView />}
        {viewMode === "day"   && <DayView />}
        {viewMode === "year"  && <YearView />}
      </div>

      {/* Legend */}
      <div style={{ padding: "6px 20px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 12, flexShrink: 0, background: WHITE }}>
        {Object.entries(EVENT_TYPES).map(([k, t]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: MUTED }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color }} />
            {t.label}
          </div>
        ))}
        <div style={{ marginRight: "auto", fontSize: 10, color: MUTED }}>
          {visibleEvents.length} אירועים {isAdminView && filterUser !== "all" ? `של ${filterUser}` : isAdminView ? "בסך הכל" : `של ${activeUser?.name}`}
        </div>
      </div>
    </div>
  );
}



const initAutos = [
  { id: 1, name: "Follow-up אוטומטי", trigger: "ליד נוצר", action: "שלח מייל + צור משימה", active: true, runs: 47 },
  { id: 2, name: "התראת עסקה תקועה", trigger: "ללא שינוי > 7 ימים", action: "שלח התראה לנציג", active: true, runs: 23 },
  { id: 3, name: "הקצאת ליד round-robin", trigger: "ליד חדש נכנס", action: "הקצה לנציג הבא", active: true, runs: 156 },
  { id: 4, name: "עדכון עם הצעה", trigger: "הצעת מחיר נשלחה", action: "עדכן שלב ל-Proposal", active: false, runs: 0 },
  { id: 5, name: "סיכום פגישה AI", trigger: "פגישה הסתיימה", action: "AI: סכם ושלח לנציג", active: true, runs: 12 },
];

const STAGES = [
  { id: "lead", label: "ליד חדש", color: "#7B8FA6" },
  { id: "discovery", label: "גילוי צרכים", color: "#5B8DEF" },
  { id: "proposal", label: "הצעת מחיר", color: GOLD },
  { id: "negotiation", label: "משא ומתן", color: "#E0703A" },
  { id: "closed_won", label: "נסגר ✓", color: OK },
];

const LEAD_STATUS = {
  new: { label: "חדש", color: "#5B8DEF" },
  contacted: { label: "פנייה", color: WARN },
  qualified: { label: "מוסמך", color: OK },
  disqualified: { label: "נפסל", color: ERR },
};

const REV_DATA = [
  { month: "נוב׳", actual: 310000, forecast: 320000 },
  { month: "דצמ׳", actual: 285000, forecast: 300000 },
  { month: "ינו׳", actual: 420000, forecast: 400000 },
  { month: "פבר׳", actual: 390000, forecast: 410000 },
  { month: "מרץ", actual: 465000, forecast: 450000 },
  { month: "אפר׳", actual: null, forecast: 520000 },
];

const FUNNEL = [
  { name: "לידים", value: 248, fill: "#5B8DEF" },
  { name: "מוסמכים", value: 142, fill: GOLD },
  { name: "הצעות", value: 67, fill: "#E0703A" },
  { name: "סגורות", value: 31, fill: OK },
];

const ACTS = [
  { id: 1, type: "email", text: "נשלח מייל ל-דוד ברקוביץ", time: "לפני 20 דק׳", user: "מיכל כהן" },
  { id: 2, type: "call", text: "שיחה עם אבי לוי — 18 דקות", time: "לפני שעה", user: "ירון לוי" },
  { id: 3, type: "deal", text: "עסקת AutoTech נסגרה בהצלחה", time: "לפני 2 שעות", user: "ירון לוי" },
  { id: 4, type: "note", text: "הערה לעסקת FinanceHub", time: "לפני 3 שעות", user: "מיכל כהן" },
  { id: 5, type: "lead", text: "ליד חדש נכנס — GlobalTech", time: "לפני 4 שעות", user: "מערכת" },
];

const fmt = (n) => n == null ? "—" : "₪" + (n >= 1000000 ? (n / 1000000).toFixed(1) + "M" : n >= 1000 ? Math.round(n / 1000) + "K" : n);

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function Av({ name, size = 34, color = BLUE }) {
  const ini = name.split(" ").map(w => w[0]).join("").slice(0, 2);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontSize: size * 0.36, fontWeight: 700, flexShrink: 0 }}>
      {ini}
    </div>
  );
}

function Bdg({ label, color = MUTED }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: color + "22", color }}>{label}</span>;
}

function Stat({ label, value, sub, trend, color = NAVY }) {
  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", minWidth: 0 }}>
      <div style={{ fontSize: 11, color: MUTED, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: trend === "up" ? OK : trend === "down" ? ERR : MUTED, marginTop: 3, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

function HBar({ score }) {
  const c = score >= 80 ? OK : score >= 60 ? WARN : ERR;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: BORDER, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: c, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: c, minWidth: 26 }}>{score}%</span>
    </div>
  );
}

function StTag({ sid }) {
  const s = STAGES.find(x => x.id === sid) || { label: sid, color: MUTED };
  return <Bdg label={s.label} color={s.color} />;
}

function Btn({ onClick, children, variant = "primary", sm = false }) {
  const bg = variant === "primary" ? NAVY : variant === "danger" ? ERR : WHITE;
  const cl = variant === "primary" || variant === "danger" ? WHITE : TEXT;
  const br = variant === "secondary" ? `1px solid ${BORDER}` : "none";
  return <button onClick={onClick} style={{ background: bg, color: cl, border: br, borderRadius: 7, padding: sm ? "4px 10px" : "8px 14px", fontWeight: 700, fontSize: sm ? 11 : 12, cursor: "pointer", fontFamily: "inherit" }}>{children}</button>;
}

function Input({ value, onChange, placeholder, type = "text", style = {} }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} style={{ padding: "8px 11px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, color: TEXT, outline: "none", background: WHITE, fontFamily: "inherit", ...style }} />;
}

function Select({ value, onChange, options, style = {} }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ padding: "8px 11px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, color: TEXT, background: WHITE, fontFamily: "inherit", ...style }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, direction: "rtl" }}>
      <div style={{ background: WHITE, borderRadius: 12, padding: 24, width, maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: MUTED }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormRow({ children }) {
  const count = Array.isArray(children) ? children.length : 1;
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 10, marginBottom: 10 }}>{children}</div>;
}

function Field({ label, children }) {
  return <div><label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>{label}</label>{children}</div>;
}

// ─── VIEWS ────────────────────────────────────────────────────────────────────

function Dashboard({ deals, leads, tasks }) {
  const pipe = deals.filter(d => !d.stage.includes("closed")).reduce((s, d) => s + d.value, 0);
  const won = deals.filter(d => d.stage === "closed_won").reduce((s, d) => s + d.value, 0);
  const wr = Math.round(deals.filter(d => d.stage === "closed_won").length / deals.length * 100);
  const openTasks = tasks.filter(t => t.status === "open").length;
  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>לוח בקרה</div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>אפריל 2026 · Q2</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
        <Stat label="PIPELINE" value={fmt(pipe)} sub="↑ 14% מהרבעון" trend="up" color={NAVY} />
        <Stat label="נסגר החודש" value={fmt(won)} sub="יעד: ₪500K" trend="up" color={OK} />
        <Stat label="WIN RATE" value={wr + "%"} sub="ממוצע: 61%" trend="up" color={BLUE} />
        <Stat label="משימות פתוחות" value={openTasks} sub={leads.filter(l => l.status !== "disqualified").length + " לידים פעילים"} color={GOLD} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>הכנסות — בפועל מול תחזית</div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={REV_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: MUTED }} />
              <YAxis tick={{ fontSize: 10, fill: MUTED }} tickFormatter={v => "₪" + v / 1000 + "K"} />
              <Tooltip formatter={v => fmt(v)} />
              <Line type="monotone" dataKey="actual" stroke={NAVY} strokeWidth={2} dot={{ fill: NAVY, r: 3 }} name="בפועל" />
              <Line type="monotone" dataKey="forecast" stroke={GOLD} strokeWidth={2} strokeDasharray="5 4" dot={false} name="תחזית" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>משפך מכירות</div>
          {FUNNEL.map((item, i) => {
            const pct = Math.round(item.value / FUNNEL[0].value * 100);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: MUTED, minWidth: 55, textAlign: "right" }}>{item.name}</div>
                <div style={{ flex: 1, height: 18, background: SURF, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: item.fill, borderRadius: 3, display: "flex", alignItems: "center", paddingRight: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: WHITE }}>{item.value}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: MUTED, minWidth: 28 }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>ביצועי צוות</div>
          {[{ name: "מיכל כהן", deals: 12, revenue: 340000, wr: 68 }, { name: "ירון לוי", deals: 9, revenue: 215000, wr: 72 }, { name: "אייל נחמני", deals: 7, revenue: 180000, wr: 55 }].map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 2 ? 8 : 0 }}>
              <Av name={m.name} size={30} color={[NAVY, BLUE, "#2563EB"][i]} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: TEXT }}>{m.name}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{m.deals} עסקאות · Win {m.wr}%</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: OK }}>{fmt(m.revenue)}</div>
            </div>
          ))}
        </div>
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>פעילות אחרונה</div>
          {ACTS.map(a => (
            <div key={a.id} style={{ display: "flex", gap: 7, marginBottom: 7 }}>
              <div style={{ fontSize: 13 }}>{({ email: "✉", call: "📞", deal: "🤝", note: "📝", lead: "⚡" })[a.type]}</div>
              <div>
                <div style={{ fontSize: 11, color: TEXT, fontWeight: 500 }}>{a.text}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{a.time} · {a.user}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeadsView({ leads, setLeads }) {
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState(""); 
  const [modal, setModal]       = useState(false);
  const [selId, setSelId]       = useState(null);
  const [selCompany, setSelCompany] = useState(null); // expanded company group
  const [editMode, setEditMode] = useState(false);
  const [dupWarning, setDupWarning] = useState(null);

  const emptyForm = { name: "", company: "", email: "", phone: "", status: "new", value: "", source: "", assignee: "מיכל כהן", notes: "" };
  const [form, setForm] = useState(emptyForm);
  const COLORS = [NAVY, BLUE, "#7C3AED", "#0891B2", "#059669", "#DC2626", "#D97706"];

  // ── Duplicate detection ──
  const checkDuplicate = (f, existingLeads) => {
    const norm = (s = "") => s.trim().toLowerCase().replace(/[-\s]/g, "");
    for (const l of existingLeads) {
      if (f.phone && norm(f.phone) && norm(l.phone) === norm(f.phone))
        return { type: "phone", match: l, msg: `טלפון זהה לליד קיים: ${l.name}` };
      if (f.company && norm(f.company) && norm(l.company) === norm(f.company))
        return { type: "company", match: l, msg: `חברה זהה לליד קיים: ${l.name} (${l.company})` };
      if (f.name && norm(f.name) && norm(l.name) === norm(f.name))
        return { type: "name", match: l, msg: `שם זהה לליד קיים: ${l.name}` };
    }
    return null;
  };

  const handleFormChange = (key, val) => {
    const updated = { ...form, [key]: val };
    setForm(updated);
    if (["name", "company", "phone"].includes(key)) setDupWarning(checkDuplicate(updated, leads));
  };

  const save = (force = false) => {
    if (!form.name || !form.company) { alert("שם וחברה הם שדות חובה"); return; }
    if (!force && dupWarning) return;
    setLeads(p => [{ ...form, id: Date.now(), score: Math.floor(Math.random() * 40 + 50), value: parseFloat(form.value) || 0, created: new Date().toISOString().slice(0, 10), activity: [] }, ...p]);
    setModal(false); setForm(emptyForm); setDupWarning(null);
  };

  const updateLead = (id, key, val) => setLeads(p => p.map(l => l.id === id ? { ...l, [key]: val } : l));

  const addNote = (id, note) => {
    if (!note.trim()) return;
    setLeads(p => p.map(l => l.id === id ? { ...l, activity: [{ id: Date.now(), type: "note", text: note, time: "עכשיו", user: "מיכל כהן" }, ...(l.activity || [])] } : l));
  };

  // ── Group by company ──
  const filtered = leads.filter(l =>
    (filter === "all" || l.status === filter) &&
    (l.name.includes(search) || l.company.includes(search) || (l.email || "").includes(search) || (l.phone || "").includes(search))
  );

  const groups = (() => {
    const map = {};
    for (const l of filtered) {
      const key = (l.company || "ללא חברה").trim();
      if (!map[key]) map[key] = [];
      map[key].push(l);
    }
    return Object.entries(map)
      .map(([company, items]) => ({ company, leads: items }))
      .sort((a, b) => Math.max(...b.leads.map(l => l.score || 0)) - Math.max(...a.leads.map(l => l.score || 0)));
  })();

  const groupStatus = (items) => {
    for (const s of ["qualified", "contacted", "new", "disqualified"]) {
      if (items.some(l => l.status === s)) return s;
    }
    return "new";
  };

  const sel = selId ? leads.find(l => l.id === selId) : null;

  // ── LEAD DETAIL PANEL ──
  const LeadDetail = () => {
    const [noteText, setNoteText] = useState("");
    const [localEdit, setLocalEdit] = useState({ ...sel });
    if (!sel) return null;
    const st = LEAD_STATUS[sel.status] || LEAD_STATUS.new;
    const sc = sel.score >= 80 ? OK : sel.score >= 60 ? WARN : ERR;
    const idx = filtered.findIndex(l => l.id === sel.id);
    const avatarColor = COLORS[Math.max(0, idx) % COLORS.length];
    const ACT_ICONS = { note: "📝", call: "📞", email: "✉", meeting: "🤝", status: "🔄" };

    return (
      <div style={{ width: 300, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
        <div style={{ padding: "13px 15px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <Av name={sel.name} size={38} color={avatarColor} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: TEXT }}>{sel.name}</div>
              <div style={{ fontSize: 11, color: BLUE, fontWeight: 600 }}>🏢 {sel.company}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={() => { if (editMode) {} setEditMode(!editMode); }}
              style={{ fontSize: 11, padding: "4px 9px", border: `1px solid ${editMode ? NAVY : BORDER}`, borderRadius: 6, background: editMode ? NAVY : WHITE, color: editMode ? WHITE : TEXT, cursor: "pointer", fontFamily: "inherit" }}>
              {editMode ? "✓ שמור" : "✎ ערוך"}
            </button>
            <button onClick={() => { setSelId(null); setEditMode(false); }} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: MUTED }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Score + status */}
          <div style={{ padding: "11px 15px", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: MUTED, marginBottom: 3 }}>ציון AI</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, height: 5, background: BORDER, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${sel.score}%`, height: "100%", background: sc, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: sc }}>{sel.score}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: MUTED, marginBottom: 3 }}>סטטוס</div>
              {editMode
                ? <select value={localEdit.status} onChange={e => { setLocalEdit(p => ({ ...p, status: e.target.value })); updateLead(sel.id, "status", e.target.value); }}
                    style={{ fontSize: 11, padding: "3px 7px", border: `1px solid ${BORDER}`, borderRadius: 6, fontFamily: "inherit" }}>
                    {Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                : <Bdg label={st.label} color={st.color} />}
            </div>
          </div>
          {/* Contact details */}
          <div style={{ padding: "11px 15px", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 9 }}>פרטי קשר</div>
            {[
              { icon: "✉", key: "email", placeholder: "email@co.il" },
              { icon: "📞", key: "phone", placeholder: "05X-XXXXXXX" },
              { icon: "🏢", key: "company", placeholder: "שם החברה" },
              { icon: "👤", key: "assignee", placeholder: "" },
            ].map(({ icon, key, placeholder }) => (
              <div key={key} style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 7 }}>
                <span style={{ fontSize: 13, width: 18, flexShrink: 0 }}>{icon}</span>
                {editMode
                  ? <input value={localEdit[key] || ""} onChange={e => { setLocalEdit(p => ({ ...p, [key]: e.target.value })); updateLead(sel.id, key, e.target.value); }}
                      placeholder={placeholder} style={{ flex: 1, fontSize: 11, padding: "4px 7px", border: `1px solid ${BORDER}`, borderRadius: 6, fontFamily: "inherit", outline: "none" }} />
                  : <span style={{ fontSize: 11, color: sel[key] ? TEXT : MUTED }}>{sel[key] || "—"}</span>}
              </div>
            ))}
          </div>
          {/* Financial + meta */}
          <div style={{ padding: "11px 15px", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "שווי פוטנציאלי", val: fmt(parseFloat(sel.value) || 0) },
                { label: "מקור", val: sel.source || "—" },
                { label: "נציג", val: sel.assignee },
                { label: "נוצר", val: sel.created || "—" },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: TEXT }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Notes */}
          <div style={{ padding: "11px 15px", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 7 }}>הערות</div>
            {editMode
              ? <textarea value={localEdit.notes || ""} onChange={e => { setLocalEdit(p => ({ ...p, notes: e.target.value })); updateLead(sel.id, "notes", e.target.value); }}
                  placeholder="הוסף הערות..." rows={2} style={{ width: "100%", fontSize: 11, padding: "6px 8px", border: `1px solid ${BORDER}`, borderRadius: 7, fontFamily: "inherit", resize: "none", outline: "none" }} />
              : <div style={{ fontSize: 11, color: sel.notes ? TEXT : MUTED, lineHeight: 1.5 }}>{sel.notes || "אין הערות"}</div>}
          </div>
          {/* Activity */}
          <div style={{ padding: "11px 15px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 9 }}>יומן פעילות</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input value={noteText} onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && noteText.trim()) { addNote(sel.id, noteText); setNoteText(""); } }}
                placeholder="הוסף הערה..." style={{ flex: 1, fontSize: 11, padding: "5px 8px", border: `1px solid ${BORDER}`, borderRadius: 6, fontFamily: "inherit", outline: "none" }} />
              <button onClick={() => { addNote(sel.id, noteText); setNoteText(""); }} style={{ fontSize: 11, padding: "5px 9px", background: NAVY, color: WHITE, border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>+</button>
            </div>
            {[
              ...(sel.activity || []),
              { id: "a1", type: "email", text: "נשלח מייל היכרות", time: "לפני 3 ימים", user: sel.assignee },
              { id: "a2", type: "call", text: "שיחת טלפון — 12 דק׳", time: "לפני 5 ימים", user: sel.assignee },
            ].map(a => (
              <div key={a.id} style={{ display: "flex", gap: 7, marginBottom: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: SURF, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>
                  {(ACT_ICONS)[a.type] || "📌"}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: TEXT, fontWeight: 500 }}>{a.text}</div>
                  <div style={{ fontSize: 10, color: MUTED }}>{a.time} · {a.user}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Footer actions */}
        <div style={{ padding: "9px 14px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 5 }}>
          <button style={{ flex: 1, padding: "7px 0", background: NAVY, color: WHITE, border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✉ מייל</button>
          <button style={{ flex: 1, padding: "7px 0", background: WHITE, color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>📞 שיחה</button>
          <button onClick={() => { if (window.confirm("למחוק ליד זה?")) { setLeads(p => p.filter(x => x.id !== sel.id)); setSelId(null); } }}
            style={{ padding: "7px 9px", background: WHITE, color: ERR, border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "16px 20px", display: "flex", gap: 14, height: "100%", overflow: "hidden" }}>

      {/* New lead modal */}
      {modal && (
        <Modal title="+ ליד חדש" onClose={() => { setModal(false); setDupWarning(null); setForm(emptyForm); }}>
          {dupWarning && (
            <div style={{ background: "#FEF3DC", border: `1px solid ${WARN}`, borderRadius: 8, padding: "10px 13px", marginBottom: 14, display: "flex", gap: 9, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: WARN, marginBottom: 2 }}>ליד דומה כבר קיים במערכת</div>
                <div style={{ fontSize: 11, color: TEXT }}>{dupWarning.msg}</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>מייל: {dupWarning.match.email || "—"} · טלפון: {dupWarning.match.phone || "—"} · סטטוס: {LEAD_STATUS[dupWarning.match.status]?.label}</div>
              </div>
            </div>
          )}
          <FormRow>
            <Field label="שם מלא *"><Input value={form.name} onChange={v => handleFormChange("name", v)} placeholder="ישראל ישראלי" style={{ width: "100%" }} /></Field>
            <Field label="חברה *"><Input value={form.company} onChange={v => handleFormChange("company", v)} placeholder="שם החברה" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="מייל"><Input value={form.email} onChange={v => handleFormChange("email", v)} placeholder="email@co.il" style={{ width: "100%" }} /></Field>
            <Field label="טלפון"><Input value={form.phone} onChange={v => handleFormChange("phone", v)} placeholder="05X-XXXXXXX" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="שווי"><Input value={form.value} onChange={v => setForm(p => ({ ...p, value: v }))} placeholder="50000" type="number" style={{ width: "100%" }} /></Field>
            <Field label="מקור">
              <Select value={form.source} onChange={v => setForm(p => ({ ...p, source: v }))} options={["", "LinkedIn", "Web Form", "Email", "Meta Ads", "WhatsApp", "המלצה"].map(x => ({ value: x, label: x || "בחר מקור" }))} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="סטטוס">
              <Select value={form.status} onChange={v => setForm(p => ({ ...p, status: v }))} options={[{ value: "new", label: "חדש" }, { value: "contacted", label: "פנייה" }, { value: "qualified", label: "מוסמך" }, { value: "disqualified", label: "נפסל" }]} style={{ width: "100%" }} />
            </Field>
            <Field label="נציג">
              <Select value={form.assignee} onChange={v => setForm(p => ({ ...p, assignee: v }))} options={["מיכל כהן", "ירון לוי", "אייל נחמני"].map(x => ({ value: x, label: x }))} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}>
            <Field label="הערות">
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="הערות ראשוניות..." rows={2}
                style={{ width: "100%", fontSize: 12, padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontFamily: "inherit", resize: "none", outline: "none" }} />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {dupWarning ? (
              <>
                <button onClick={() => save(true)} style={{ background: WARN, color: WHITE, border: "none", borderRadius: 7, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>הוסף בכל זאת</button>
                <button onClick={() => { setSelId(dupWarning.match.id); setSelCompany(dupWarning.match.company); setModal(false); setDupWarning(null); }}
                  style={{ background: WHITE, color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 7, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>פתח ליד קיים</button>
                <Btn onClick={() => { setModal(false); setDupWarning(null); setForm(emptyForm); }} variant="secondary">ביטול</Btn>
              </>
            ) : (
              <>
                <Btn onClick={() => save(false)}>✓ שמור ליד</Btn>
                <Btn onClick={() => { setModal(false); setForm(emptyForm); }} variant="secondary">ביטול</Btn>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Left: company-grouped list */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>ניהול לידים</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{groups.length} חברות · {filtered.length} אנשי קשר</div>
          </div>
          <Btn onClick={() => { setForm(emptyForm); setDupWarning(null); setModal(true); }}>+ ליד חדש</Btn>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 7, marginBottom: 10, flexShrink: 0 }}>
          <Input value={search} onChange={setSearch} placeholder="🔍 חברה, שם, מייל, טלפון..." style={{ flex: 1 }} />
          {["all", "new", "contacted", "qualified", "disqualified"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding: "7px 10px", borderRadius: 7, border: `1px solid ${filter === s ? NAVY : BORDER}`, background: filter === s ? NAVY : WHITE, color: filter === s ? WHITE : TEXT, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
              {{ all: "הכל", new: "חדש", contacted: "פנייה", qualified: "מוסמך", disqualified: "נפסל" }[s]}
            </button>
          ))}
        </div>

        {/* Company groups */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {groups.length === 0 && (
            <div style={{ textAlign: "center", padding: 32, color: MUTED, fontSize: 12 }}>אין לידים תואמים</div>
          )}

          {groups.map((group, gi) => {
            const isExpanded = selCompany === group.company;
            const gs = groupStatus(group.leads);
            const gst = LEAD_STATUS[gs] || LEAD_STATUS.new;
            const bestScore = Math.max(...group.leads.map(l => l.score || 0));
            const bsc = bestScore >= 80 ? OK : bestScore >= 60 ? WARN : ERR;
            const totalValue = group.leads.reduce((s, l) => s + (parseFloat(l.value) || 0), 0);

            return (
              <div key={group.company} style={{ marginBottom: 8, border: `1px solid ${isExpanded ? NAVY : BORDER}`, borderRadius: 10, overflow: "hidden" }}>

                {/* ── Company header ── */}
                <div
                  onClick={() => { setSelCompany(isExpanded ? null : group.company); if (isExpanded) setSelId(null); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 15px", background: isExpanded ? NAVY : WHITE, cursor: "pointer" }}
                  onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = SURF; }}
                  onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = WHITE; }}>

                  {/* Company icon */}
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: isExpanded ? "rgba(255,255,255,0.15)" : SURF, border: `1px solid ${isExpanded ? "rgba(255,255,255,0.2)" : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    🏢
                  </div>

                  {/* Company name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: isExpanded ? WHITE : TEXT }}>{group.company}</div>
                    <div style={{ fontSize: 11, color: isExpanded ? "rgba(255,255,255,0.6)" : MUTED, marginTop: 1 }}>
                      {group.leads.length} {group.leads.length === 1 ? "איש קשר" : "אנשי קשר"}
                      {group.leads[0]?.source ? ` · ${group.leads[0].source}` : ""}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: bsc }}>{bestScore}</div>
                      <div style={{ fontSize: 9, color: isExpanded ? "rgba(255,255,255,0.5)" : MUTED }}>ציון</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: isExpanded ? WHITE : NAVY }}>{fmt(totalValue)}</div>
                      <div style={{ fontSize: 9, color: isExpanded ? "rgba(255,255,255,0.5)" : MUTED }}>שווי</div>
                    </div>
                    <Bdg label={gst.label} color={isExpanded ? "rgba(255,255,255,0.9)" : gst.color} />
                    <div style={{ fontSize: 26, fontWeight: 400, color: isExpanded ? "rgba(255,255,255,0.7)" : MUTED, transition: "transform .2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", lineHeight: 1 }}>⌄</div>
                  </div>
                </div>

                {/* ── Contacts list (expanded) ── */}
                {isExpanded && (
                  <div style={{ background: SURF }}>
                    {group.leads.map((l, li) => {
                      const st = LEAD_STATUS[l.status] || LEAD_STATUS.new;
                      const sc = l.score >= 80 ? OK : l.score >= 60 ? WARN : ERR;
                      const isSel = selId === l.id;
                      return (
                        <div key={l.id}
                          onClick={e => { e.stopPropagation(); setSelId(isSel ? null : l.id); setEditMode(false); }}
                          style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 18px 10px 15px", borderTop: `1px solid ${BORDER}`, background: isSel ? GOLD_L : WHITE, cursor: "pointer" }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "rgba(255,255,255,0.7)"; }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = WHITE; }}>

                          {/* Indent + avatar */}
                          <div style={{ width: 2, height: 32, background: BORDER, borderRadius: 1, marginRight: 4, flexShrink: 0 }} />
                          <Av name={l.name} size={30} color={COLORS[li % COLORS.length]} />

                          {/* Name + title */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: TEXT }}>{l.name}</div>
                            <div style={{ fontSize: 10, color: MUTED }}>{l.email || "—"} {l.phone ? `· ${l.phone}` : ""}</div>
                          </div>

                          {/* Score dot */}
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: sc }}>{l.score}</span>
                          </div>

                          <Bdg label={st.label} color={st.color} />
                          <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, minWidth: 48, textAlign: "left" }}>{fmt(l.value)}</div>
                          <div style={{ fontSize: 12, color: MUTED }}>›</div>
                        </div>
                      );
                    })}

                    {/* Add lead to this company */}
                    <div style={{ padding: "9px 18px", borderTop: `1px solid ${BORDER}` }}>
                      <button onClick={e => { e.stopPropagation(); setForm({ ...emptyForm, company: group.company }); setDupWarning(null); setModal(true); }}
                        style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", border: `1px dashed ${BORDER}`, borderRadius: 7, background: "transparent", color: MUTED, cursor: "pointer", fontFamily: "inherit" }}>
                        + הוסף איש קשר ל-{group.company}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: lead detail panel */}
      {sel && <LeadDetail />}
    </div>
  );
}
function PipelineView({ deals, setDeals }) {
  const [dragId, setDragId] = useState(null);
  const [dropSt, setDropSt] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", company: "", value: "", probability: 50, stage: "lead", assignee: "מיכל כהן", closeDate: "" });
  const pipe = deals.filter(d => !d.stage.includes("closed")).reduce((s, d) => s + d.value, 0);
  const save = () => {
    if (!form.title || !form.company) { alert("כותרת וחברה הם שדות חובה"); return; }
    setDeals(p => [{ ...form, id: Date.now(), value: parseFloat(form.value) || 0, probability: parseInt(form.probability) || 50, health: 60 }, ...p]);
    setModal(false);
  };
  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {modal && (
        <Modal title="+ עסקה חדשה" onClose={() => setModal(false)}>
          <FormRow>
            <Field label="שם עסקה *"><Input value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="שם העסקה" style={{ width: "100%" }} /></Field>
            <Field label="חברה *"><Input value={form.company} onChange={v => setForm(p => ({ ...p, company: v }))} placeholder="שם החברה" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="שווי (₪)"><Input value={form.value} onChange={v => setForm(p => ({ ...p, value: v }))} placeholder="120000" type="number" style={{ width: "100%" }} /></Field>
            <Field label="הסתברות %"><Input value={form.probability} onChange={v => setForm(p => ({ ...p, probability: v }))} placeholder="60" type="number" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="שלב">
              <Select value={form.stage} onChange={v => setForm(p => ({ ...p, stage: v }))} options={STAGES.map(s => ({ value: s.id, label: s.label }))} style={{ width: "100%" }} />
            </Field>
            <Field label="תאריך סגירה"><Input value={form.closeDate} onChange={v => setForm(p => ({ ...p, closeDate: v }))} type="date" style={{ width: "100%" }} /></Field>
          </FormRow>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn onClick={save}>✓ שמור</Btn>
            <Btn onClick={() => setModal(false)} variant="secondary">ביטול</Btn>
          </div>
        </Modal>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>ניהול Pipeline</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>גרור עסקאות בין שלבים</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ fontSize: 12, color: MUTED, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "7px 12px", fontWeight: 600 }}>
            סה״כ: <span style={{ color: NAVY, fontWeight: 800 }}>{fmt(pipe)}</span>
          </div>
          <Btn onClick={() => setModal(true)}>+ עסקה</Btn>
        </div>
      </div>
      <div style={{ display: "flex", gap: 9, overflowX: "auto", flex: 1, paddingBottom: 6 }}>
        {STAGES.map(stage => {
          const sd = deals.filter(d => d.stage === stage.id);
          const isOver = dropSt === stage.id;
          return (
            <div key={stage.id}
              style={{ minWidth: 190, width: 190, display: "flex", flexDirection: "column", gap: 6, background: isOver ? GOLD_L : SURF, borderRadius: 9, border: `2px solid ${isOver ? GOLD : "transparent"}`, padding: 9 }}
              onDragOver={e => { e.preventDefault(); setDropSt(stage.id); }}
              onDrop={() => { if (dragId) setDeals(ds => ds.map(d => d.id === dragId ? { ...d, stage: stage.id } : d)); setDragId(null); setDropSt(null); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: stage.color }} />
                  <span style={{ fontWeight: 700, fontSize: 11, color: TEXT }}>{stage.label}</span>
                </div>
                <span style={{ fontSize: 10, color: MUTED, fontWeight: 600 }}>{fmt(sd.reduce((s, d) => s + d.value, 0))}</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {sd.length === 0 && <div style={{ textAlign: "center", padding: "14px 0", fontSize: 11, color: MUTED }}>גרור עסקה לכאן</div>}
                {sd.map(deal => (
                  <div key={deal.id} draggable onDragStart={() => setDragId(deal.id)}
                    style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 7, padding: 9, cursor: "grab", borderLeft: `3px solid ${stage.color}` }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,0.07)"}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                    <div style={{ fontWeight: 700, fontSize: 11, color: TEXT, marginBottom: 2 }}>{deal.title}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginBottom: 5 }}>{deal.company}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: NAVY, marginBottom: 4 }}>{fmt(deal.value)}</div>
                    <HBar score={deal.health} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: MUTED }}>{deal.closeDate}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: deal.probability >= 70 ? OK : deal.probability >= 40 ? WARN : ERR }}>{deal.probability}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClientsView({ clients, setClients, clientContacts, deals }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", industry: "טכנולוגיה", email: "", phone: "", address: "", website: "", size: "10-50", status: "active", assignee: "מיכל כהן", notes: "" });
  const filtered = clients.filter(c => !search || c.name.includes(search) || c.industry.includes(search));
  const save = () => {
    if (!form.name) { alert("שם חברה הוא שדה חובה"); return; }
    setClients(p => [{ ...form, id: Date.now(), since: new Date().toISOString().slice(0, 10) }, ...p]);
    setModal(false);
    setForm({ name: "", industry: "טכנולוגיה", email: "", phone: "", address: "", website: "", size: "10-50", status: "active", assignee: "מיכל כהן", notes: "" });
  };
  const cl = selected ? clients.find(c => c.id === selected) : null;
  const clContacts = cl ? clientContacts.filter(c => c.clientId === cl.id) : [];
  const clDeals = cl ? deals.filter(d => d.company === cl.name) : [];
  return (
    <div style={{ padding: "16px 20px", display: "flex", gap: 14, height: "100%", overflow: "hidden" }}>
      {modal && (
        <Modal title="🏢 לקוח חדש" onClose={() => setModal(false)} width={560}>
          <FormRow>
            <Field label="שם חברה *"><Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="שם החברה" style={{ width: "100%" }} /></Field>
            <Field label="תעשייה">
              <Select value={form.industry} onChange={v => setForm(p => ({ ...p, industry: v }))} options={["טכנולוגיה", "פיננסים", "שיווק", "רכב", "בריאות", "נדל\"ן", "אחר"].map(x => ({ value: x, label: x }))} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="מייל"><Input value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="info@co.il" style={{ width: "100%" }} /></Field>
            <Field label="טלפון"><Input value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="03-XXXXXXX" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="כתובת"><Input value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="תל אביב" style={{ width: "100%" }} /></Field>
            <Field label="גודל">
              <Select value={form.size} onChange={v => setForm(p => ({ ...p, size: v }))} options={["1-10", "10-50", "50-200", "200+"].map(x => ({ value: x, label: x }))} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}>
            <Field label="הערות">
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="הערות..." style={{ width: "100%", padding: "8px 11px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, resize: "vertical", minHeight: 60, outline: "none", fontFamily: "inherit" }} />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={save}>✓ שמור לקוח</Btn>
            <Btn onClick={() => setModal(false)} variant="secondary">ביטול</Btn>
          </div>
        </Modal>
      )}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>🏢 לקוחות</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{filtered.length} לקוחות</div>
          </div>
          <Btn onClick={() => setModal(true)}>+ לקוח חדש</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
          <Stat label="סה״כ לקוחות" value={clients.length} color={NAVY} />
          <Stat label="פעילים" value={clients.filter(c => c.status === "active").length} color={OK} />
          <Stat label="מתעניינים" value={clients.filter(c => c.status === "prospect").length} color={WARN} />
          <Stat label="שווי כולל" value={fmt(clients.reduce((s, c) => s + deals.filter(d => d.company === c.name).reduce((ss, d) => ss + d.value, 0), 0))} color={OK} />
        </div>
        <Input value={search} onChange={setSearch} placeholder="🔍 חיפוש לקוח..." style={{ width: "100%", marginBottom: 12 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
          {filtered.map(c => {
            const cds = deals.filter(d => d.company === c.name);
            const ccs = clientContacts.filter(x => x.clientId === c.id);
            return (
              <div key={c.id} onClick={() => setSelected(selected === c.id ? null : c.id)}
                style={{ background: selected === c.id ? GOLD_L : WHITE, border: `1px solid ${selected === c.id ? GOLD : BORDER}`, borderRadius: 10, padding: 14, cursor: "pointer", position: "relative" }}
                onMouseEnter={e => { if (selected !== c.id) e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.08)"; }}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <div style={{ position: "absolute", top: 10, left: 10 }}>
                  <span style={{ background: c.status === "active" ? "#E6F4EE" : "#FEF3DC", color: c.status === "active" ? OK : WARN, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{c.status === "active" ? "✓ פעיל" : "מתעניין"}</span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, marginTop: 6 }}>
                  <Av name={c.name} size={38} color={NAVY} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: TEXT }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{c.industry} · {c.size} עובדים</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 10 }}>
                  <div style={{ background: SURF, borderRadius: 6, padding: "6px 0", textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 800, color: NAVY }}>{cds.length}</div><div style={{ fontSize: 9, color: MUTED }}>עסקאות</div></div>
                  <div style={{ background: SURF, borderRadius: 6, padding: "6px 0", textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 800, color: GOLD }}>{ccs.length}</div><div style={{ fontSize: 9, color: MUTED }}>אנשי קשר</div></div>
                  <div style={{ background: SURF, borderRadius: 6, padding: "6px 0", textAlign: "center" }}><div style={{ fontSize: 13, fontWeight: 800, color: OK }}>{fmt(cds.reduce((s, d) => s + d.value, 0))}</div><div style={{ fontSize: 9, color: MUTED }}>שווי</div></div>
                </div>
                {c.email && <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>✉ {c.email}</div>}
                {c.phone && <div style={{ fontSize: 10, color: MUTED }}>📞 {c.phone}</div>}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button onClick={e => { e.stopPropagation(); if (window.confirm("למחוק?")) setClients(p => p.filter(x => x.id !== c.id)); }} style={{ fontSize: 10, padding: "3px 7px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: ERR, fontFamily: "inherit" }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {cl && (
        <div style={{ width: 280, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <Av name={cl.name} size={48} color={NAVY} />
            <div style={{ fontWeight: 800, fontSize: 14, color: TEXT, marginTop: 8 }}>{cl.name}</div>
            <div style={{ fontSize: 11, color: MUTED }}>{cl.industry}</div>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 8 }}>פרטי קשר</div>
            {cl.email && <div style={{ fontSize: 11, color: TEXT, marginBottom: 4 }}>✉ {cl.email}</div>}
            {cl.phone && <div style={{ fontSize: 11, color: TEXT, marginBottom: 4 }}>📞 {cl.phone}</div>}
            {cl.address && <div style={{ fontSize: 11, color: TEXT, marginBottom: 4 }}>📍 {cl.address}</div>}
          </div>
          {clContacts.length > 0 && (
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 8 }}>אנשי קשר</div>
              {clContacts.map(cc => (
                <div key={cc.id} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                  <Av name={cc.name} size={26} color={BLUE} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: TEXT }}>{cc.name}{cc.main ? " ⭐" : ""}</div>
                    <div style={{ fontSize: 10, color: MUTED }}>{cc.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {clDeals.length > 0 && (
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 8 }}>עסקאות</div>
              {clDeals.map(d => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11 }}>
                  <div><div style={{ fontWeight: 600, color: TEXT }}>{d.title}</div><StTag sid={d.stage} /></div>
                  <div style={{ fontWeight: 700, color: NAVY }}>{fmt(d.value)}</div>
                </div>
              ))}
            </div>
          )}
          {cl.notes && <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 4, fontSize: 11, color: MUTED }}><div style={{ fontWeight: 700, marginBottom: 4 }}>הערות</div>{cl.notes}</div>}
        </div>
      )}
    </div>
  );
}

function ProjectsView({ projects, setProjects, clients }) {
  const [openId, setOpenId] = useState(null);          // project detail open
  const [modal, setModal] = useState(false);            // new project modal
  const [editPhaseId, setEditPhaseId] = useState(null); // inline phase edit
  const [newPhaseName, setNewPhaseName] = useState("");

  const emptyForm = { name: "", desc: "", clientId: "", status: "planning", priority: "medium", budget: "", spent: "", progress: 0, startDate: "", endDate: "", assignee: "מיכל כהן", tags: "", contactId: "" };
  const [form, setForm] = useState(emptyForm);

  const STATUS_COLOR  = { active: OK, planning: BLUE, completed: MUTED, paused: WARN };
  const STATUS_LABEL  = { active: "פעיל", planning: "תכנון", completed: "הושלם", paused: "מושהה" };
  const PHASE_COLOR   = { done: OK, active: BLUE, pending: MUTED, blocked: ERR };
  const PHASE_LABEL   = { done: "הושלם", active: "בעבודה", pending: "ממתין", blocked: "חסום" };
  const PRIO_COLOR    = { high: ERR, medium: WARN, low: OK };
  const PRIO_LABEL    = { high: "🔴 גבוהה", medium: "🟡 בינונית", low: "🟢 נמוכה" };

  const save = () => {
    if (!form.name) { alert("שם פרויקט הוא שדה חובה"); return; }
    const newProj = {
      ...form, id: Date.now(),
      clientId: parseInt(form.clientId) || null,
      budget: parseFloat(form.budget) || 0,
      spent: parseFloat(form.spent) || 0,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [],
      phases: [],
    };
    setProjects(p => [newProj, ...p]);
    setModal(false);
    setForm(emptyForm);
  };

  const addPhase = (projId) => {
    if (!newPhaseName.trim()) return;
    setProjects(prev => prev.map(p => p.id !== projId ? p : {
      ...p,
      phases: [...(p.phases || []), {
        id: Date.now(), name: newPhaseName.trim(), status: "pending",
        startDate: "", endDate: "", budget: 0, spent: 0, notes: "",
      }],
    }));
    setNewPhaseName("");
  };

  const updatePhase = (projId, phaseId, key, val) => {
    setProjects(prev => prev.map(p => p.id !== projId ? p : {
      ...p,
      phases: p.phases.map(ph => ph.id !== phaseId ? ph : { ...ph, [key]: val }),
    }));
  };

  const deletePhase = (projId, phaseId) => {
    setProjects(prev => prev.map(p => p.id !== projId ? p : {
      ...p, phases: p.phases.filter(ph => ph.id !== phaseId),
    }));
  };

  const openProj = projects.find(p => p.id === openId);

  // ── PROJECT DETAIL VIEW ──
  if (openProj) {
    const cl  = clients.find(c => c.id === openProj.clientId) || { name: "—" };
    const sc  = STATUS_COLOR[openProj.status] || MUTED;
    const pct = Math.round((openProj.spent || 0) / Math.max(openProj.budget || 1, 1) * 100);
    const remaining = (openProj.budget || 0) - (openProj.spent || 0);
    const phases = openProj.phases || [];
    const donePhases = phases.filter(ph => ph.status === "done").length;

    return (
      <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>

        {/* Back + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={() => setOpenId(null)} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: TEXT, fontFamily: "inherit" }}>← חזרה לפרויקטים</button>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>{openProj.name}</div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: sc + "22", color: sc }}>{STATUS_LABEL[openProj.status]}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: PRIO_COLOR[openProj.priority] + "22", color: PRIO_COLOR[openProj.priority] }}>{PRIO_LABEL[openProj.priority]}</span>
          {(openProj.tags || []).map((t, i) => <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: "#EEF2FF", color: "#4F46E5" }}>{t}</span>)}
        </div>

        {/* Top grid: info + financials */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>

          {/* Project info */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 12 }}>פרטי פרויקט</div>
            {openProj.desc && <div style={{ fontSize: 12, color: MUTED, marginBottom: 12, lineHeight: 1.5 }}>{openProj.desc}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["🏢 לקוח", cl.name],
                ["👤 מנהל פרויקט", openProj.assignee],
                ["📅 התחלה", openProj.startDate || "—"],
                ["🏁 סיום מתוכנן", openProj.endDate || "—"],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{val}</div>
                </div>
              ))}
            </div>
            {/* Overall progress */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, marginBottom: 5 }}>
                <span>התקדמות כוללת</span>
                <span style={{ color: sc }}>{openProj.progress}%</span>
              </div>
              <div style={{ height: 8, background: BORDER, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${openProj.progress}%`, height: "100%", background: sc, borderRadius: 4, transition: "width .5s" }} />
              </div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{donePhases} מתוך {phases.length} שלבים הושלמו</div>
            </div>
          </div>

          {/* Financials */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 12 }}>פרטים פיננסיים</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { label: "תקציב", value: fmt(openProj.budget), color: NAVY },
                { label: "בוצע", value: fmt(openProj.spent), color: pct > 90 ? ERR : OK },
                { label: "יתרה", value: fmt(remaining), color: remaining < 0 ? ERR : OK },
              ].map(s => (
                <div key={s.label} style={{ background: SURF, borderRadius: 8, padding: "10px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Budget bar */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                <span>ניצול תקציב</span>
                <span style={{ color: pct > 90 ? ERR : pct > 70 ? WARN : OK }}>{pct}%</span>
              </div>
              <div style={{ height: 10, background: BORDER, borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: pct > 90 ? ERR : pct > 70 ? WARN : OK, borderRadius: 5 }} />
              </div>
            </div>
            {/* Per-phase financial summary */}
            <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 6 }}>תקציב לפי שלב</div>
            {phases.map(ph => {
              const phPct = Math.round((ph.spent || 0) / Math.max(ph.budget || 1, 1) * 100);
              return (
                <div key={ph.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: TEXT }}>{ph.name}</span>
                  <span style={{ color: MUTED }}>{fmt(ph.spent)} / {fmt(ph.budget)} <span style={{ color: phPct > 90 ? ERR : MUTED }}>({phPct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phases timeline */}
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>שלבי הפרויקט ({phases.length})</div>
          </div>

          {phases.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: MUTED, fontSize: 12 }}>אין שלבים עדיין — הוסף שלב ראשון</div>
          )}

          {phases.map((ph, idx) => {
            const phSc = PHASE_COLOR[ph.status] || MUTED;
            const isEditing = editPhaseId === ph.id;
            return (
              <div key={ph.id} style={{ borderBottom: idx < phases.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                {/* Phase row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                  {/* Step indicator */}
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: phSc + "22", border: `2px solid ${phSc}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 700, color: phSc }}>
                    {ph.status === "done" ? "✓" : idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>{ph.name}</div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 8, background: phSc + "22", color: phSc }}>{PHASE_LABEL[ph.status]}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 11, color: MUTED }}>
                      {ph.startDate && <span>📅 {ph.startDate} → {ph.endDate || "—"}</span>}
                      {ph.budget > 0 && <span>💰 {fmt(ph.spent)} / {fmt(ph.budget)}</span>}
                      {ph.notes && <span>📝 {ph.notes}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => setEditPhaseId(isEditing ? null : ph.id)}
                      style={{ fontSize: 10, padding: "4px 9px", border: `1px solid ${BORDER}`, borderRadius: 6, background: isEditing ? NAVY : WHITE, color: isEditing ? WHITE : TEXT, cursor: "pointer", fontFamily: "inherit" }}>
                      {isEditing ? "סגור" : "✎ ערוך"}
                    </button>
                    <button onClick={() => deletePhase(openProj.id, ph.id)}
                      style={{ fontSize: 10, padding: "4px 8px", border: `1px solid ${BORDER}`, borderRadius: 6, background: WHITE, color: ERR, cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
                  </div>
                </div>

                {/* Inline edit panel */}
                {isEditing && (
                  <div style={{ margin: "0 16px 14px", padding: 14, background: SURF, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>סטטוס</div>
                        <select value={ph.status} onChange={e => updatePhase(openProj.id, ph.id, "status", e.target.value)}
                          style={{ width: "100%", padding: "7px 9px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
                          {Object.entries(PHASE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>תאריך התחלה</div>
                        <input type="date" value={ph.startDate} onChange={e => updatePhase(openProj.id, ph.id, "startDate", e.target.value)}
                          style={{ width: "100%", padding: "7px 9px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>תאריך סיום</div>
                        <input type="date" value={ph.endDate} onChange={e => updatePhase(openProj.id, ph.id, "endDate", e.target.value)}
                          style={{ width: "100%", padding: "7px 9px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>תקציב שלב (₪)</div>
                        <input type="number" value={ph.budget} onChange={e => updatePhase(openProj.id, ph.id, "budget", parseFloat(e.target.value) || 0)}
                          style={{ width: "100%", padding: "7px 9px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>בוצע (₪)</div>
                        <input type="number" value={ph.spent} onChange={e => updatePhase(openProj.id, ph.id, "spent", parseFloat(e.target.value) || 0)}
                          style={{ width: "100%", padding: "7px 9px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>שם השלב</div>
                        <input value={ph.name} onChange={e => updatePhase(openProj.id, ph.id, "name", e.target.value)}
                          style={{ width: "100%", padding: "7px 9px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>הערות</div>
                      <input value={ph.notes} onChange={e => updatePhase(openProj.id, ph.id, "notes", e.target.value)}
                        placeholder="הערות על שלב זה..." style={{ width: "100%", padding: "7px 9px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <button onClick={() => setEditPhaseId(null)} style={{ background: OK, color: WHITE, border: "none", borderRadius: 7, padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>✓ שמור שלב</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add phase row */}
          <div style={{ padding: "10px 16px", background: SURF, display: "flex", gap: 8, alignItems: "center" }}>
            <input value={newPhaseName} onChange={e => setNewPhaseName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPhase(openProj.id)}
              placeholder="שם שלב חדש..."
              style={{ flex: 1, padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
            <button onClick={() => addPhase(openProj.id)}
              style={{ background: NAVY, color: WHITE, border: "none", borderRadius: 7, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ הוסף שלב</button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => {
            setProjects(prev => prev.map(p => p.id === openProj.id ? { ...p, status: "completed", progress: 100 } : p));
            setOpenId(null);
          }} variant="secondary">✓ סמן כהושלם</Btn>
          <Btn onClick={() => { if (window.confirm("למחוק פרויקט זה?")) { setProjects(ps => ps.filter(x => x.id !== openProj.id)); setOpenId(null); } }} variant="danger">🗑 מחק פרויקט</Btn>
        </div>
      </div>
    );
  }

  // ── PROJECTS LIST ──
  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>
      {modal && (
        <Modal title="📁 פרויקט חדש" onClose={() => setModal(false)} width={560}>
          <FormRow>
            <Field label="שם פרויקט *"><Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="שם הפרויקט" style={{ width: "100%" }} /></Field>
            <Field label="לקוח">
              <Select value={form.clientId} onChange={v => setForm(p => ({ ...p, clientId: v }))} options={[{ value: "", label: "-- בחר לקוח --" }, ...clients.map(c => ({ value: c.id, label: c.name }))]} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}><Field label="תיאור"><Input value={form.desc} onChange={v => setForm(p => ({ ...p, desc: v }))} placeholder="תיאור הפרויקט" style={{ width: "100%" }} /></Field></div>
          <FormRow>
            <Field label="סטטוס">
              <Select value={form.status} onChange={v => setForm(p => ({ ...p, status: v }))} options={[{ value: "planning", label: "תכנון" }, { value: "active", label: "פעיל" }, { value: "paused", label: "מושהה" }, { value: "completed", label: "הושלם" }]} style={{ width: "100%" }} />
            </Field>
            <Field label="עדיפות">
              <Select value={form.priority} onChange={v => setForm(p => ({ ...p, priority: v }))} options={[{ value: "high", label: "🔴 גבוהה" }, { value: "medium", label: "🟡 בינונית" }, { value: "low", label: "🟢 נמוכה" }]} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="תקציב (₪)"><Input value={form.budget} onChange={v => setForm(p => ({ ...p, budget: v }))} type="number" placeholder="80000" style={{ width: "100%" }} /></Field>
            <Field label="נציג אחראי">
              <Select value={form.assignee} onChange={v => setForm(p => ({ ...p, assignee: v }))} options={["מיכל כהן", "ירון לוי", "אייל נחמני"].map(x => ({ value: x, label: x }))} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="תאריך התחלה"><Input value={form.startDate} onChange={v => setForm(p => ({ ...p, startDate: v }))} type="date" style={{ width: "100%" }} /></Field>
            <Field label="תאריך סיום"><Input value={form.endDate} onChange={v => setForm(p => ({ ...p, endDate: v }))} type="date" style={{ width: "100%" }} /></Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}><Field label="תגיות (מופרד בפסיקים)"><Input value={form.tags} onChange={v => setForm(p => ({ ...p, tags: v }))} placeholder="CRM, טכנולוגיה" style={{ width: "100%" }} /></Field></div>
          <div style={{ display: "flex", gap: 8 }}><Btn onClick={save}>✓ צור פרויקט</Btn><Btn onClick={() => setModal(false)} variant="secondary">ביטול</Btn></div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div><div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>📁 פרויקטים</div><div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{projects.length} פרויקטים · לחץ על פרויקט לצפייה מלאה</div></div>
        <Btn onClick={() => setModal(true)}>+ פרויקט חדש</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        <Stat label="סה״כ" value={projects.length} color={NAVY} />
        <Stat label="פעילים" value={projects.filter(p => p.status === "active").length} color={OK} />
        <Stat label="בתכנון" value={projects.filter(p => p.status === "planning").length} color={BLUE} />
        <Stat label="הושלמו" value={projects.filter(p => p.status === "completed").length} color={MUTED} />
      </div>

      {projects.map(p => {
        const cl  = clients.find(c => c.id === p.clientId) || { name: "—" };
        const sc  = STATUS_COLOR[p.status] || MUTED;
        const pct = Math.round((p.spent || 0) / Math.max(p.budget || 1, 1) * 100);
        const phases = p.phases || [];
        const donePhases = phases.filter(ph => ph.status === "done").length;
        return (
          <div key={p.id} onClick={() => setOpenId(p.id)}
            style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, marginBottom: 10, borderRight: `4px solid ${sc}`, cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,.07)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: TEXT, marginBottom: 3 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{cl.name} · {p.assignee}</div>
                <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                  <span style={{ background: sc + "22", color: sc, padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{STATUS_LABEL[p.status]}</span>
                  <span style={{ background: PRIO_COLOR[p.priority] + "22", color: PRIO_COLOR[p.priority], padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{PRIO_LABEL[p.priority]}</span>
                  {(p.tags || []).map((t, i) => <span key={i} style={{ background: "#EEF2FF", color: "#4F46E5", padding: "2px 7px", borderRadius: 10, fontSize: 10, fontWeight: 600 }}>{t}</span>)}
                </div>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>תקציב: {fmt(p.budget)}</div>
                <div style={{ fontSize: 11, color: pct > 90 ? ERR : OK }}>בוצע: {fmt(p.spent)} ({pct}%)</div>
                {phases.length > 0 && <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{donePhases}/{phases.length} שלבים ✓</div>}
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                <span>התקדמות</span><span style={{ color: sc }}>{p.progress}%</span>
              </div>
              <div style={{ height: 6, background: BORDER, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${p.progress}%`, height: "100%", background: sc, borderRadius: 3 }} />
              </div>
            </div>

            {/* Phase mini-timeline */}
            {phases.length > 0 && (
              <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                {phases.map(ph => (
                  <div key={ph.id} title={ph.name + " — " + PHASE_LABEL[ph.status]}
                    style={{ flex: 1, height: 6, borderRadius: 3, background: PHASE_COLOR[ph.status] || MUTED }} />
                ))}
              </div>
            )}

            {p.startDate && <div style={{ fontSize: 10, color: MUTED, marginTop: 8 }}>{p.startDate} → {p.endDate || "—"} · לחץ לפרטים מלאים →</div>}
          </div>
        );
      })}
    </div>
  );
}

function ContactsView({ contacts, setContacts, clients, clientContacts, setClientContacts }) {
  const [selClientId, setSelClientId] = useState(null);   // which client is expanded
  const [selContactId, setSelContactId] = useState(null); // which contact detail is open
  const [search, setSearch]     = useState("");
  const [addContactModal, setAddContactModal] = useState(false); // for which clientId
  const [form, setForm] = useState({ name: "", title: "", email: "", phone: "", main: false, notes: "" });

  const COLORS = [NAVY, BLUE, "#7C3AED", "#0891B2", "#059669", "#DC2626", "#D97706"];

  // Contacts grouped by client (from clientContacts) + standalone contacts
  const getClientContacts = (clientId) => clientContacts.filter(cc => cc.clientId === clientId);
  const standaloneContacts = contacts.filter(ct => !clientContacts.some(cc => cc.name === ct.name && cc.email === ct.email));

  const filteredClients = clients.filter(cl =>
    !search ||
    cl.name.toLowerCase().includes(search.toLowerCase()) ||
    getClientContacts(cl.id).some(cc => cc.name.toLowerCase().includes(search.toLowerCase()) || (cc.email || "").toLowerCase().includes(search.toLowerCase()))
  );

  const selClient  = selClientId  ? clients.find(c => c.id === selClientId) : null;
  const selContact = selContactId ? [...clientContacts, ...contacts.map(c => ({ ...c, clientId: null }))].find(c => c.id === selContactId) : null;

  const saveContact = (clientId) => {
    if (!form.name) { alert("שם הוא שדה חובה"); return; }
    const newContact = { ...form, id: Date.now(), clientId, lastContact: new Date().toISOString().slice(0, 10), deals: 0 };
    setClientContacts(p => [...p, newContact]);
    setAddContactModal(false);
    setForm({ name: "", title: "", email: "", phone: "", main: false, notes: "" });
  };

  const deleteContact = (id) => {
    setClientContacts(p => p.filter(c => c.id !== id));
    setContacts(p => p.filter(c => c.id !== id));
    setSelContactId(null);
  };

  // ── Contact detail panel ──
  const ContactDetail = () => {
    if (!selContact) return null;
    const parentClient = clients.find(c => c.id === selContact.clientId);
    return (
      <div style={{ width: 260, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, overflowY: "auto", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <Av name={selContact.name} size={46} color={NAVY} />
            <div style={{ fontWeight: 800, fontSize: 13, color: TEXT, marginTop: 8 }}>{selContact.name}</div>
            {selContact.main && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: GOLD + "22", color: WARN }}>איש קשר ראשי ⭐</span>}
            <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{selContact.title || "—"}</div>
            {parentClient && (
              <div style={{ fontSize: 11, fontWeight: 600, color: BLUE, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                🏢 {parentClient.name}
              </div>
            )}
          </div>
          <button onClick={() => setSelContactId(null)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: MUTED, marginTop: -4 }}>✕</button>
        </div>

        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            ["✉", selContact.email, "מייל"],
            ["📞", selContact.phone, "טלפון"],
            ["📅", "פנייה: " + (selContact.lastContact || "—"), ""],
            ["🤝", (selContact.deals || 0) + " עסקאות", ""],
          ].map(([ico, val, label], i) => val && (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, alignItems: "center" }}>
              <span style={{ width: 16 }}>{ico}</span>
              <span style={{ color: TEXT, flex: 1 }}>{val}</span>
            </div>
          ))}
        </div>

        {selContact.notes && (
          <div style={{ background: SURF, borderRadius: 7, padding: 9, marginTop: 10, fontSize: 11, color: MUTED, borderRight: `3px solid ${GOLD}` }}>
            📝 {selContact.notes}
          </div>
        )}

        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          <button style={{ flex: 1, padding: "7px 0", background: NAVY, color: WHITE, border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✉ מייל</button>
          <button style={{ flex: 1, padding: "7px 0", background: WHITE, color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>📞 שיחה</button>
          <button onClick={() => { if (window.confirm("למחוק?")) deleteContact(selContact.id); }}
            style={{ padding: "7px 10px", background: WHITE, color: ERR, border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "16px 20px", display: "flex", gap: 14, height: "100%", overflow: "hidden" }}>

      {/* Add contact modal */}
      {addContactModal && (
        <Modal title={`👤 איש קשר חדש — ${clients.find(c => c.id === addContactModal)?.name || ""}`} onClose={() => { setAddContactModal(false); setForm({ name: "", title: "", email: "", phone: "", main: false, notes: "" }); }}>
          <FormRow>
            <Field label="שם מלא *"><Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="ישראל ישראלי" style={{ width: "100%" }} /></Field>
            <Field label="תפקיד"><Input value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="CEO / CTO / VP..." style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="מייל"><Input value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="name@co.il" style={{ width: "100%" }} /></Field>
            <Field label="טלפון"><Input value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="05X-XXXXXXX" style={{ width: "100%" }} /></Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}>
            <Field label="הערות"><Input value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} placeholder="הערות..." style={{ width: "100%" }} /></Field>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={form.main} onChange={e => setForm(p => ({ ...p, main: e.target.checked }))} />
            סמן כאיש קשר ראשי של הלקוח
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => saveContact(addContactModal)}>✓ שמור</Btn>
            <Btn onClick={() => setAddContactModal(false)} variant="secondary">ביטול</Btn>
          </div>
        </Modal>
      )}

      {/* Main: client-grouped list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>👤 אנשי קשר</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>מאורגן לפי לקוח · {clientContacts.length} אנשי קשר</div>
          </div>
        </div>

        <Input value={search} onChange={setSearch} placeholder="🔍 חיפוש לפי לקוח או שם..." style={{ width: "100%", marginBottom: 14 }} />

        {/* Client groups */}
        {filteredClients.map((cl, ci) => {
          const clContacts = getClientContacts(cl.id);
          const isExpanded = selClientId === cl.id;
          const mainContact = clContacts.find(c => c.main);

          return (
            <div key={cl.id} style={{ marginBottom: 10, border: `1px solid ${isExpanded ? NAVY : BORDER}`, borderRadius: 10, overflow: "hidden" }}>

              {/* Client header row */}
              <div onClick={() => { setSelClientId(isExpanded ? null : cl.id); setSelContactId(null); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: isExpanded ? NAVY : WHITE, cursor: "pointer" }}
                onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = SURF; }}
                onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = WHITE; }}>

                {/* Client avatar */}
                <div style={{ width: 38, height: 38, borderRadius: 9, background: isExpanded ? WHITE + "22" : SURF, border: `1px solid ${isExpanded ? WHITE + "44" : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  🏢
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: isExpanded ? WHITE : TEXT }}>{cl.name}</div>
                  <div style={{ fontSize: 11, color: isExpanded ? WHITE + "aa" : MUTED, marginTop: 1 }}>
                    {cl.industry} · {clContacts.length} {clContacts.length === 1 ? "איש קשר" : "אנשי קשר"}
                    {mainContact && ` · ${mainContact.name} (ראשי)`}
                  </div>
                </div>

                {/* Status badge */}
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 10, background: cl.status === "active" ? (isExpanded ? WHITE + "22" : "#EAF3DE") : (isExpanded ? WHITE + "22" : "#FEF3DC"), color: cl.status === "active" ? (isExpanded ? WHITE : OK) : (isExpanded ? WHITE : WARN) }}>
                  {cl.status === "active" ? "✓ פעיל" : "מתעניין"}
                </span>

                {/* Contact count pill */}
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: isExpanded ? WHITE + "22" : SURF, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: isExpanded ? WHITE : NAVY }}>
                  {clContacts.length}
                </div>

                {/* Chevron */}
                <div style={{ fontSize: 12, color: isExpanded ? WHITE : MUTED, transition: "transform .2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</div>
              </div>

              {/* Expanded contacts list */}
              {isExpanded && (
                <div style={{ background: SURF }}>
                  {clContacts.length === 0 && (
                    <div style={{ padding: "16px 20px", textAlign: "center", color: MUTED, fontSize: 12 }}>אין אנשי קשר לחברה זו עדיין</div>
                  )}

                  {clContacts.map((cc, i) => {
                    const isSelContact = selContactId === cc.id;
                    return (
                      <div key={cc.id}
                        onClick={e => { e.stopPropagation(); setSelContactId(isSelContact ? null : cc.id); }}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px 11px 16px", borderTop: `1px solid ${BORDER}`, background: isSelContact ? GOLD_L : WHITE, cursor: "pointer" }}
                        onMouseEnter={e => { if (!isSelContact) e.currentTarget.style.background = WHITE + "cc"; }}
                        onMouseLeave={e => { if (!isSelContact) e.currentTarget.style.background = WHITE; }}>

                        {/* Indent line */}
                        <div style={{ width: 2, height: 36, background: cc.main ? GOLD : BORDER, borderRadius: 1, marginRight: 4, flexShrink: 0 }} />

                        <Av name={cc.name} size={32} color={COLORS[i % COLORS.length]} />

                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: TEXT }}>{cc.name}</div>
                            {cc.main && <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 8, background: GOLD + "33", color: WARN }}>ראשי</span>}
                          </div>
                          <div style={{ fontSize: 11, color: MUTED }}>{cc.role || cc.title || "—"}</div>
                        </div>

                        <div style={{ textAlign: "left" }}>
                          {cc.email && <div style={{ fontSize: 10, color: MUTED }}>{cc.email}</div>}
                          {cc.phone && <div style={{ fontSize: 10, color: MUTED }}>{cc.phone}</div>}
                        </div>

                        <div style={{ fontSize: 12, color: MUTED }}>›</div>
                      </div>
                    );
                  })}

                  {/* Add contact button */}
                  <div style={{ padding: "10px 20px", borderTop: `1px solid ${BORDER}` }}>
                    <button onClick={e => { e.stopPropagation(); setAddContactModal(cl.id); }}
                      style={{ fontSize: 11, fontWeight: 600, padding: "6px 13px", border: `1px dashed ${BORDER}`, borderRadius: 7, background: "transparent", color: MUTED, cursor: "pointer", fontFamily: "inherit" }}>
                      + הוסף איש קשר ל-{cl.name}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Standalone contacts (not linked to any client) */}
        {standaloneContacts.length > 0 && (
          <div style={{ marginBottom: 10, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: SURF, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>👤 אנשי קשר ללא לקוח ({standaloneContacts.length})</div>
            </div>
            {standaloneContacts.map((ct, i) => (
              <div key={ct.id} onClick={() => setSelContactId(selContactId === ct.id ? null : ct.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: `1px solid ${BORDER}`, background: selContactId === ct.id ? GOLD_L : WHITE, cursor: "pointer" }}
                onMouseEnter={e => { if (selContactId !== ct.id) e.currentTarget.style.background = SURF; }}
                onMouseLeave={e => { if (selContactId !== ct.id) e.currentTarget.style.background = WHITE; }}>
                <Av name={ct.name} size={32} color={COLORS[i % COLORS.length]} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: TEXT }}>{ct.name}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{ct.title} {ct.company ? `· ${ct.company}` : ""}</div>
                </div>
                <div style={{ textAlign: "left", fontSize: 10, color: MUTED }}>{ct.lastContact}</div>
                <div style={{ fontSize: 12, color: MUTED }}>›</div>
              </div>
            ))}
          </div>
        )}

        {filteredClients.length === 0 && standaloneContacts.length === 0 && (
          <div style={{ textAlign: "center", padding: 32, color: MUTED, fontSize: 12 }}>לא נמצאו תוצאות לחיפוש</div>
        )}
      </div>

      {/* Right: contact detail */}
      {selContact && <ContactDetail />}
    </div>
  );
}

function AnalyticsView({ deals }) {
  const bd = [{ name: "מיכל", revenue: 340000 }, { name: "ירון", revenue: 215000 }, { name: "אייל", revenue: 180000 }];
  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 14 }}><div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>📊 אנליטיקס</div><div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>Q2 2026</div></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
        <Stat label="הכנסות Q2" value="₪1.87M" sub="↑ 22% מ-Q1" trend="up" />
        <Stat label="תחזית Q2" value="₪2.1M" sub="88% השגה" trend="up" />
        <Stat label="עסקאות" value="31" sub="יעד: 40" trend="up" />
        <Stat label="מחזור מכירה" value="24 יום" sub="↓ 18% שיפור" trend="up" color={OK} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12, marginBottom: 12 }}>
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>ביצועי צוות</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={bd}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} />
              <YAxis tick={{ fontSize: 10, fill: MUTED }} tickFormatter={v => "₪" + v / 1000 + "K"} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="revenue" fill={NAVY} radius={[4, 4, 0, 0]} name="הכנסות" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>Pipeline לפי שלב</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={FUNNEL} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value">
                {FUNNEL.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 6 }}>
            {FUNNEL.map((d, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: MUTED }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: d.fill }} />{d.name}</div>)}
          </div>
        </div>
      </div>
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "11px 13px", borderBottom: `1px solid ${BORDER}`, fontWeight: 700, fontSize: 12, color: TEXT }}>עסקאות פעילות</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr style={{ background: SURF }}>{["עסקה", "שלב", "שווי", "הסתברות", "בריאות", "סגירה"].map(hd => <th key={hd} style={{ padding: "8px 11px", textAlign: "right", fontWeight: 700, color: MUTED, fontSize: 10 }}>{hd}</th>)}</tr></thead>
          <tbody>
            {deals.map(d => (
              <tr key={d.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                <td style={{ padding: "8px 11px" }}><div style={{ fontWeight: 600, color: TEXT }}>{d.title}</div><div style={{ fontSize: 10, color: MUTED }}>{d.company}</div></td>
                <td style={{ padding: "8px 11px" }}><StTag sid={d.stage} /></td>
                <td style={{ padding: "8px 11px", fontWeight: 700, color: NAVY }}>{fmt(d.value)}</td>
                <td style={{ padding: "8px 11px", fontWeight: 700, color: d.probability >= 70 ? OK : d.probability >= 40 ? WARN : ERR }}>{d.probability}%</td>
                <td style={{ padding: "8px 11px", minWidth: 80 }}><HBar score={d.health} /></td>
                <td style={{ padding: "8px 11px", color: MUTED }}>{d.closeDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AutomationsView({ autos, setAutos }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", trigger: "ליד נוצר", action: "שלח מייל + צור משימה", active: true });
  const save = () => {
    if (!form.name) { alert("שם הוא שדה חובה"); return; }
    setAutos(p => [{ ...form, id: Date.now(), runs: 0 }, ...p]);
    setModal(false);
  };
  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>
      {modal && (
        <Modal title="🔄 אוטומציה חדשה" onClose={() => setModal(false)}>
          <div style={{ marginBottom: 10 }}><Field label="שם *"><Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="שם האוטומציה" style={{ width: "100%" }} /></Field></div>
          <FormRow>
            <Field label="כאשר (Trigger)"><Input value={form.trigger} onChange={v => setForm(p => ({ ...p, trigger: v }))} placeholder="ליד נוצר" style={{ width: "100%" }} /></Field>
            <Field label="אז (Action)"><Input value={form.action} onChange={v => setForm(p => ({ ...p, action: v }))} placeholder="שלח מייל" style={{ width: "100%" }} /></Field>
          </FormRow>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}><Btn onClick={save}>✓ צור</Btn><Btn onClick={() => setModal(false)} variant="secondary">ביטול</Btn></div>
        </Modal>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div><div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>🔄 אוטומציות</div><div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>When → Then · ללא קוד</div></div>
        <Btn onClick={() => setModal(true)}>+ אוטומציה חדשה</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
        <Stat label="פעילות" value={autos.filter(a => a.active).length} color={OK} />
        <Stat label="הרצות" value={autos.reduce((s, a) => s + a.runs, 0)} sub="↑ 34%" trend="up" />
        <Stat label="שעות שנחסכו" value="~42h" color={GOLD} />
      </div>
      {autos.map(a => (
        <div key={a.id} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 9, padding: 12, display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: a.active ? NAVY : SURF, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{a.active ? "⚡" : "💤"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: TEXT, fontSize: 12 }}>{a.name}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2, display: "flex", gap: 6 }}>
              <span style={{ background: "#EEF2FF", color: "#4F46E5", padding: "2px 7px", borderRadius: 4, fontWeight: 600, fontSize: 10 }}>כאשר: {a.trigger}</span>
              <span>→</span>
              <span style={{ background: "#F0FDF4", color: OK, padding: "2px 7px", borderRadius: 4, fontWeight: 600, fontSize: 10 }}>אז: {a.action}</span>
            </div>
          </div>
          <div style={{ textAlign: "center", minWidth: 40 }}><div style={{ fontSize: 14, fontWeight: 800, color: a.active ? NAVY : MUTED }}>{a.runs}</div><div style={{ fontSize: 9, color: MUTED }}>הרצות</div></div>
          <div onClick={() => setAutos(p => p.map(x => x.id === a.id ? { ...x, active: !x.active } : x))} style={{ width: 38, height: 20, borderRadius: 10, background: a.active ? OK : BORDER, cursor: "pointer", position: "relative", flexShrink: 0 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: WHITE, position: "absolute", top: 3, left: a.active ? 21 : 3, transition: "left 0.2s" }} />
          </div>
          <button onClick={() => setAutos(p => p.filter(x => x.id !== a.id))} style={{ fontSize: 10, padding: "3px 6px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: ERR, flexShrink: 0, fontFamily: "inherit" }}>🗑</button>
        </div>
      ))}
    </div>
  );
}

function TasksView({ tasks, setTasks }) {
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ desc: "", type: "call", priority: "medium", date: "", time: "09:00", client: "", notes: "" });
  const today = new Date().toISOString().slice(0, 10);
  const save = () => {
    if (!form.desc || !form.date) { alert("תיאור ותאריך הם שדות חובה"); return; }
    setTasks(p => [{ ...form, id: "t" + Date.now(), status: "open", created: today }, ...p]);
    setModal(false);
    setForm({ desc: "", type: "call", priority: "medium", date: "", time: "09:00", client: "", notes: "" });
  };
  const filtered = tasks.filter(t => {
    if (filter === "open") return t.status === "open";
    if (filter === "done") return t.status === "done";
    if (filter === "today") return t.status === "open" && t.date === today;
    if (filter === "overdue") return t.status === "open" && t.date < today;
    return true;
  });
  const stats = {
    total: tasks.length,
    open: tasks.filter(t => t.status === "open").length,
    done: tasks.filter(t => t.status === "done").length,
    today: tasks.filter(t => t.status === "open" && t.date === today).length,
    overdue: tasks.filter(t => t.status === "open" && t.date < today).length,
  };
  const ICONS = { call: "📞", email: "✉", meeting: "🤝", proposal: "📋", followup: "🔁", other: "📌" };
  const PRIO = { high: { label: "🔴 גבוהה", color: ERR }, medium: { label: "🟡 בינונית", color: WARN }, low: { label: "🟢 נמוכה", color: OK } };
  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>
      {modal && (
        <Modal title="✅ משימה חדשה" onClose={() => setModal(false)}>
          <div style={{ marginBottom: 10 }}><Field label="תיאור *"><Input value={form.desc} onChange={v => setForm(p => ({ ...p, desc: v }))} placeholder="תאר את המשימה..." style={{ width: "100%" }} /></Field></div>
          <FormRow>
            <Field label="סוג"><Select value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} options={[{ value: "call", label: "📞 שיחה" }, { value: "email", label: "✉ מייל" }, { value: "meeting", label: "🤝 פגישה" }, { value: "proposal", label: "📋 הצעה" }, { value: "followup", label: "🔁 Follow-up" }, { value: "other", label: "📌 אחר" }]} style={{ width: "100%" }} /></Field>
            <Field label="עדיפות"><Select value={form.priority} onChange={v => setForm(p => ({ ...p, priority: v }))} options={[{ value: "high", label: "🔴 גבוהה" }, { value: "medium", label: "🟡 בינונית" }, { value: "low", label: "🟢 נמוכה" }]} style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="תאריך *"><Input value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} type="date" style={{ width: "100%" }} /></Field>
            <Field label="שעה"><Input value={form.time} onChange={v => setForm(p => ({ ...p, time: v }))} type="time" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="לקוח"><Input value={form.client} onChange={v => setForm(p => ({ ...p, client: v }))} placeholder="שם הלקוח" style={{ width: "100%" }} /></Field>
            <Field label="הערות"><Input value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} placeholder="הערות..." style={{ width: "100%" }} /></Field>
          </FormRow>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}><Btn onClick={save}>✓ שמור</Btn><Btn onClick={() => setModal(false)} variant="secondary">ביטול</Btn></div>
        </Modal>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div><div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>✅ מנהל משימות</div><div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{stats.open} פתוחות · {stats.done} הושלמו</div></div>
        <Btn onClick={() => setModal(true)}>+ משימה חדשה</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 12 }}>
        <Stat label="סה״כ" value={stats.total} color={NAVY} />
        <Stat label="פתוחות" value={stats.open} color={BLUE} />
        <Stat label="היום" value={stats.today} color={WARN} />
        <Stat label="באיחור" value={stats.overdue} color={ERR} />
        <Stat label="הושלמו" value={stats.done} color={OK} />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {["all", "open", "today", "overdue", "done"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 11px", borderRadius: 6, border: `1px solid ${filter === f ? NAVY : BORDER}`, background: filter === f ? NAVY : WHITE, color: filter === f ? WHITE : TEXT, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {{ all: "הכל", open: "פתוחות", today: "היום", overdue: "באיחור", done: "הושלמו" }[f]}
          </button>
        ))}
      </div>
      {filtered.length === 0 && <div style={{ textAlign: "center", padding: 32, color: MUTED }}>אין משימות תואמות</div>}
      {filtered.map(t => {
        const pr = PRIO[t.priority] || PRIO.medium;
        const isOver = t.status === "open" && t.date && t.date < today;
        const isToday = t.date === today;
        return (
          <div key={t.id} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 9, padding: 12, marginBottom: 8, borderRight: `4px solid ${t.status === "done" ? BORDER : pr.color}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div onClick={() => setTasks(p => p.map(x => x.id === t.id ? { ...x, status: x.status === "done" ? "open" : "done" } : x))}
                style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${t.status === "done" ? OK : BORDER}`, background: t.status === "done" ? OK : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: 1 }}>
                {t.status === "done" && <span style={{ color: WHITE, fontSize: 10 }}>✓</span>}
              </div>
              <div style={{ flex: 1, opacity: t.status === "done" ? 0.55 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{ICONS[t.type] || "📌"}</span>
                  <div style={{ fontWeight: 700, fontSize: 12, color: TEXT, textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.desc}</div>
                </div>
                {t.client && <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>🏢 {t.client}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: isOver ? "#FDECEC" : isToday ? "#FEF3DC" : "transparent", color: isOver ? ERR : isToday ? WARN : MUTED, padding: "2px 6px", borderRadius: 4 }}>📅 {t.date}{t.time ? " " + t.time : ""}{isOver ? " — באיחור" : isToday ? " — היום" : ""}</span>
                  <span style={{ fontSize: 11, color: pr.color, fontWeight: 600 }}>{pr.label}</span>
                  {t.notes && <span style={{ fontSize: 10, color: MUTED }}>📝 {t.notes}</span>}
                </div>
              </div>
              <button onClick={() => setTasks(p => p.filter(x => x.id !== t.id))} style={{ fontSize: 10, padding: "3px 6px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: ERR, flexShrink: 0, fontFamily: "inherit" }}>🗑</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ImportView() {
  const [step, setStep] = useState(1);
  const [type, setType] = useState("");
  const [file, setFile] = useState(null);
  const TYPES = [
    { id: "leads", icon: "⚡", label: "לידים", desc: "לידים פוטנציאליים" },
    { id: "clients", icon: "🏢", label: "לקוחות", desc: "בסיס לקוחות" },
    { id: "deals", icon: "◫", label: "עסקאות", desc: "Pipeline" },
    { id: "contacts", icon: "👤", label: "אנשי קשר", desc: "ספר טלפונים" },
  ];
  return (
    <div style={{ padding: "16px 20px", height: "100%", overflowY: "auto" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>⬆ שאיבת תוכן</div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>ייבוא נתונים מקובץ Excel / CSV</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
        {["העלאת קובץ", "מיפוי עמודות", "תצוגה מקדימה", "סיום"].map((lbl, i) => {
          const active = step === i + 1, done = step > i + 1;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i > 0 ? 1 : "auto" }}>
              {i > 0 && <div style={{ flex: 1, height: 2, background: done ? OK : BORDER }} />}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? OK : active ? NAVY : BORDER, color: (done || active) ? WHITE : MUTED, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{done ? "✓" : i + 1}</div>
                <div style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? NAVY : MUTED }}>{lbl}</div>
              </div>
            </div>
          );
        })}
      </div>
      {step === 1 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 10 }}>1. בחר סוג נתונים לייבוא</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
            {TYPES.map(tc => (
              <div key={tc.id} onClick={() => setType(tc.id)} style={{ border: `2px solid ${type === tc.id ? GOLD : BORDER}`, borderRadius: 10, padding: 14, textAlign: "center", cursor: "pointer", background: type === tc.id ? GOLD_L : WHITE }}>
                <div style={{ fontSize: 24, marginBottom: 5 }}>{tc.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{tc.label}</div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{tc.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 10 }}>2. העלה קובץ</div>
          <label style={{ display: "block", border: "2px dashed " + BORDER, borderRadius: 10, padding: 32, textAlign: "center", cursor: "pointer", background: SURF }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 4 }}>לחץ לבחירת קובץ</div>
            <div style={{ fontSize: 11, color: MUTED }}>תומך בקבצי .xlsx / .xls / .csv</div>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); if (type) setStep(2); } }} style={{ display: "none" }} />
          </label>
          <div style={{ marginTop: 12, padding: "10px 14px", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <div style={{ flex: 1, fontSize: 11, color: MUTED }}>לא בטוח בפורמט? הורד תבנית Excel מוכנה</div>
            <button style={{ fontSize: 11, padding: "5px 11px", border: `1px solid ${BORDER}`, borderRadius: 6, background: WHITE, cursor: "pointer", color: TEXT, fontFamily: "inherit" }}>⬇ הורד תבנית</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 4 }}>{file ? file.name : "קובץ הועלה"}</div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>מיפוי אוטומטי לשדות {({ leads: "לידים", clients: "לקוחות", deals: "עסקאות", contacts: "אנשי קשר" })[type] || type}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Btn onClick={() => setStep(3)}>המשך לתצוגה מקדימה →</Btn>
            <Btn onClick={() => setStep(1)} variant="secondary">← חזור</Btn>
          </div>
        </div>
      )}
      {step === 3 && (
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>👁</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 4 }}>תצוגה מקדימה</div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>3 שורות לדוגמה מהקובץ</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Btn onClick={() => setStep(4)}>ייבא רשומות</Btn>
            <Btn onClick={() => setStep(2)} variant="secondary">← חזור</Btn>
          </div>
        </div>
      )}
      {step === 4 && (
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: OK, marginBottom: 4 }}>ייבוא הושלם בהצלחה!</div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>הרשומות יובאו למערכת</div>
          <Btn onClick={() => { setStep(1); setType(""); setFile(null); }}>↺ ייבוא נוסף</Btn>
        </div>
      )}
    </div>
  );
}

function UsersView({ users, setUsers, onImpersonate, currentUser }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "נציג מכירות", active: true });
  const MAX = 20;
  const save = () => {
    if (!form.name || !form.email) { alert("שם ומייל הם שדות חובה"); return; }
    if (users.some(u => u.email.toLowerCase() === form.email.toLowerCase())) { alert("מייל כבר קיים במערכת"); return; }
    if (users.length >= MAX) { alert("הגעת למקסימום " + MAX + " משתמשים"); return; }
    setUsers(p => [...p, { ...form, id: Date.now(), joined: new Date().toISOString().slice(0, 10), lastLogin: "—" }]);
    setModal(false);
    setForm({ name: "", email: "", role: "נציג מכירות", active: true });
  };
  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>
      {modal && (
        <Modal title="👤 משתמש חדש" onClose={() => setModal(false)}>
          <FormRow>
            <Field label="שם מלא *"><Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="ישראל ישראלי" style={{ width: "100%" }} /></Field>
            <Field label="מייל *"><Input value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="user@co.il" type="email" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="תפקיד"><Input value={form.role} onChange={v => setForm(p => ({ ...p, role: v }))} placeholder="נציג מכירות" style={{ width: "100%" }} /></Field>
            <Field label="סטטוס">
              <Select value={form.active ? "true" : "false"} onChange={v => setForm(p => ({ ...p, active: v === "true" }))} options={[{ value: "true", label: "פעיל" }, { value: "false", label: "לא פעיל" }]} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}><Btn onClick={save}>✓ הוסף</Btn><Btn onClick={() => setModal(false)} variant="secondary">ביטול</Btn></div>
        </Modal>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div><div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>⚙ ניהול משתמשים</div><div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{users.length} / {MAX} משתמשים</div></div>
        {users.length < MAX ? <Btn onClick={() => setModal(true)}>+ משתמש חדש</Btn> : <span style={{ fontSize: 11, color: ERR, background: "#FDECEC", padding: "6px 12px", borderRadius: 7, fontWeight: 600 }}>הגעת למקסימום</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        <Stat label="סה״כ" value={`${users.length} / ${MAX}`} color={NAVY} />
        <Stat label="פעילים" value={users.filter(u => u.active).length} color={OK} />
        <Stat label="מנהלים" value={users.filter(u => u.role === "מנהל מערכת").length} color={NAVY} />
        <Stat label="מושבתים" value={users.filter(u => !u.active).length} color={MUTED} />
      </div>
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: SURF }}>
              {["משתמש", "מייל", "תפקיד", "כניסה", "הצטרף", "סטטוס", "פעולות"].map(hd => (
                <th key={hd} style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: MUTED, fontSize: 11 }}>{hd}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                <td style={{ padding: "9px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Av name={u.name} size={28} color={u.id === 1 ? GOLD : NAVY} />
                    <div style={{ fontWeight: 700, color: TEXT, fontSize: 12 }}>{u.name}{u.id === 1 ? " 👑" : ""}</div>
                  </div>
                </td>
                <td style={{ padding: "9px 12px", fontSize: 11, color: MUTED }}>{u.email}</td>
                <td style={{ padding: "9px 12px" }}><span style={{ background: NAVY + "22", color: NAVY, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{u.role}</span></td>
                <td style={{ padding: "9px 12px", fontSize: 11, color: MUTED }}>{u.lastLogin}</td>
                <td style={{ padding: "9px 12px", fontSize: 11, color: MUTED }}>{u.joined}</td>
                <td style={{ padding: "9px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: u.active ? OK : BORDER }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: u.active ? OK : MUTED }}>{u.active ? "פעיל" : "לא פעיל"}</span>
                  </div>
                </td>
                <td style={{ padding: "9px 12px" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {u.id !== currentUser?.id && onImpersonate && (
                      <button onClick={() => onImpersonate(u)} style={{ fontSize: 10, padding: "3px 7px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: BLUE, fontFamily: "inherit" }}>👁 צפה כ</button>
                    )}
                    {u.id !== 1 && (
                      <button onClick={() => setUsers(p => p.map(x => x.id === u.id ? { ...x, active: !x.active } : x))} style={{ fontSize: 10, padding: "3px 7px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: u.active ? WARN : OK, fontFamily: "inherit" }}>
                        {u.active ? "⏸ השבת" : "▶ הפעל"}
                      </button>
                    )}
                    {u.id !== 1 && (
                      <button onClick={() => { if (window.confirm("למחוק?")) setUsers(p => p.filter(x => x.id !== u.id)); }} style={{ fontSize: 10, padding: "3px 7px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: ERR, fontFamily: "inherit" }}>🗑</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AIView({ leads, deals }) {
  const [prompt, setPrompt] = useState("");
  const [msgs, setMsgs] = useState([{
    role: "assistant",
    content: "שלום! אני ה-AI Assistant של SalesFlow CRM.\n\nאני יכול לעזור עם:\n• שאלות על נתוני ה-CRM\n• כתיבת אימיילים ללקוחות\n• המלצות אסטרטגיות\n• ניתוח ביצועים\n\nשאל אותי כל שאלה!"
  }]);
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);
  const SUGGS = ["כמה עסקאות פתוחות?", "כתוב מייל מעקב ל-FinanceHub", "מי הנציג הכי טוב?", "Next Best Action ל-StartupX"];

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [msgs, loading]);

  const send = async () => {
    if (!prompt.trim() || loading) return;
    const q = prompt.trim();
    setPrompt("");
    const nm = [...msgs, { role: "user", content: q }];
    setMsgs(nm);
    setLoading(true);
    const pipe = deals.filter(d => !d.stage.includes("closed")).reduce((s, d) => s + d.value, 0);
    const sys = `אתה AI Assistant של SalesFlow CRM של Shiluv I²R. נתוני CRM: ${leads.length} לידים, Pipeline ₪${pipe.toLocaleString()}, ${deals.filter(d => d.stage === "closed_won").length} עסקאות שנסגרו. צוות: מיכל כהן (Win 68%), ירון לוי (Win 72%), אייל נחמני (Win 55%). ענה בעברית, קצר ומקצועי. אם מבקשים אימייל — כתוב אימייל מלא.`;
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: sys, messages: nm })
      });
      const d = await r.json();
      setMsgs(m => [...m, { role: "assistant", content: d.content?.[0]?.text || "שגיאה" }]);
    } catch {
      setMsgs(m => [...m, { role: "assistant", content: "שגיאת חיבור. אנא נסה שוב." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>✦ AI Assistant</div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>מופעל על ידי Claude</div>
      </div>
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 9, marginBottom: 9 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-start" : "flex-end" }}>
            <div style={{ maxWidth: "72%", padding: "10px 13px", borderRadius: m.role === "user" ? "10px 10px 10px 2px" : "10px 10px 2px 10px", background: m.role === "user" ? NAVY : WHITE, border: m.role === "assistant" ? `1px solid ${BORDER}` : "none", color: m.role === "user" ? WHITE : TEXT, fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "10px 10px 2px 10px", padding: "10px 13px", color: MUTED, fontSize: 12 }}>⏳ חושב...</div>
          </div>
        )}
      </div>
      {msgs.length <= 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 9, flexShrink: 0 }}>
          {SUGGS.map((s, i) => (
            <button key={i} onClick={() => setPrompt(s)} style={{ fontSize: 11, padding: "5px 10px", border: `1px solid ${BORDER}`, borderRadius: 16, background: WHITE, cursor: "pointer", color: TEXT, fontFamily: "inherit" }}>{s}</button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
        <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} placeholder="שאל שאלה, בקש אימייל, או בקש המלצה..." style={{ flex: 1, padding: "9px 13px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: TEXT, direction: "rtl", outline: "none", fontFamily: "inherit" }} />
        <button onClick={send} disabled={!prompt.trim() || loading} style={{ background: NAVY, color: WHITE, border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: !prompt.trim() || loading ? 0.5 : 1, fontFamily: "inherit" }}>שלח</button>
      </div>
    </div>
  );
}


// ─── INTEGRATIONS VIEW ────────────────────────────────────────────────────────

const INTEGRATION_SOURCES = [
  { id: "website", label: "אתר אינטרנט", icon: "🌐", color: "#185FA5", colorBg: "#E6F1FB", method: "Webhook", status: "active", today: 4, total: 127, lastLead: "לפני 12 דק׳", inFields: ["full_name", "email", "phone", "message", "utm_source"], mapping: { full_name: "name", email: "email", phone: "phone", message: "notes", utm_source: "source" }, webhookUrl: "https://api.salesflow.co.il/v1/leads?source=website&key=sf_live_***" },
  { id: "facebook", label: "פייסבוק Lead Ads", icon: "📘", color: "#3b5998", colorBg: "#eef0f8", method: "API Polling", status: "active", today: 7, total: 284, lastLead: "לפני 3 דק׳", inFields: ["full_name", "email", "phone_number", "campaign_name", "ad_id"], mapping: { full_name: "name", email: "email", phone_number: "phone", campaign_name: "source", ad_id: "notes" }, pollInterval: "כל שעה", accessToken: "" },
  { id: "google", label: "Google Ads", icon: "G", color: "#c0392b", colorBg: "#fde8e7", method: "API Polling", status: "active", today: 2, total: 98, lastLead: "לפני שעה", inFields: ["Name", "Email", "Phone", "Campaign", "Keyword"], mapping: { Name: "name", Email: "email", Phone: "phone", Campaign: "source", Keyword: "notes" }, pollInterval: "כל שעה", customerId: "" },
  { id: "whatsapp", label: "WhatsApp Business", icon: "💬", color: "#1A7A4A", colorBg: "#E6F4EE", method: "Webhook", status: "inactive", today: 0, total: 31, lastLead: "אתמול", inFields: ["contact_name", "wa_id", "message_body"], mapping: { contact_name: "name", wa_id: "phone", message_body: "notes" }, webhookUrl: "https://api.salesflow.co.il/v1/leads?source=whatsapp&key=sf_live_***" },
];

const CRM_FIELDS_MAP = ["name", "email", "phone", "source", "assignee", "notes", "value", "status"];

function IntegrationsView({ leads, setLeads }) {
  const [tab, setTab] = useState("sources");
  const [sources, setSources] = useState(INTEGRATION_SOURCES);
  const [selId, setSelId] = useState(null);
  const [mappingSource, setMappingSource] = useState("website");
  const [logFilter, setLogFilter] = useState("all");
  const [logStatus, setLogStatus] = useState("all");
  const [testForm, setTestForm] = useState({ name: "ישראל ישראלי בדיקה", email: "test@example.com", phone: "052-0000000", source: "website", notes: "" });
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [logs, setLogs] = useState([
    { time: "13:42", source: "facebook", name: "דוד כהן", email: "david@co.il", score: 82, status: "ok" },
    { time: "13:38", source: "website", name: "שרה לוי", email: "sara@example.com", score: 74, status: "ok" },
    { time: "13:21", source: "google", name: "אבי ברק", email: "avi@test.co.il", score: 91, status: "ok" },
    { time: "13:05", source: "facebook", name: "רותם שמיר", email: "rotem@dup.co.il", score: 0, status: "dup" },
    { time: "12:33", source: "whatsapp", name: "גיל אבן", email: "—", score: 0, status: "err" },
  ]);

  const sel = sources.find(s => s.id === selId);
  const activeCount = sources.filter(s => s.status === "active").length;
  const todayTotal = sources.reduce((a, s) => a + s.today, 0);
  const totalAll = sources.reduce((a, s) => a + s.total, 0);
  const SOURCE_LABEL = { website: "אתר", facebook: "פייסבוק", google: "Google", whatsapp: "WhatsApp" };

  const addSimLead = () => {
    const names = ["יוסי בן דוד", "רחל שפירא", "אמיר עוז", "ליאת גולן", "עמיר ניר"];
    const srcs = ["website", "facebook", "google", "whatsapp"];
    const statuses = ["ok", "ok", "ok", "dup", "err"];
    const name = names[Math.floor(Math.random() * names.length)];
    const src = srcs[Math.floor(Math.random() * srcs.length)];
    const st = statuses[Math.floor(Math.random() * statuses.length)];
    const score = st === "ok" ? Math.floor(Math.random() * 40 + 55) : 0;
    const now = new Date();
    const t = now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");
    const newLog = { time: t, source: src, name, email: name.split(" ")[0].toLowerCase() + "@test.co.il", score, status: st };
    setLogs(p => [newLog, ...p]);
    if (st === "ok") {
      setSources(p => p.map(s => s.id === src ? { ...s, today: s.today + 1, total: s.total + 1, lastLead: "עכשיו" } : s));
      setLeads(p => [{ id: Date.now(), name, company: "—", email: newLog.email, phone: "—", status: "new", score, value: 0, source: src, assignee: "מיכל כהן" }, ...p]);
    }
  };

  const runTest = () => {
    if (!testForm.name || !testForm.email) { alert("שם ומייל הם שדות חובה"); return; }
    setTestLoading(true); setTestResult(null);
    setTimeout(() => {
      const score = Math.floor(Math.random() * 35 + 55);
      const id = "lead_" + Date.now();
      const assignees = ["מיכל כהן", "ירון לוי", "אייל נחמני"];
      const assignee = assignees[Math.floor(Math.random() * 3)];
      const result = { status: "created", lead_id: id, ...testForm, ai_score: score, assigned_to: assignee, created_at: new Date().toISOString() };
      setTestResult(result);
      setTestLoading(false);
      setLeads(p => [{ id: Date.now(), name: testForm.name, company: "—", email: testForm.email, phone: testForm.phone || "—", status: "new", score, value: 0, source: testForm.source, assignee }, ...p]);
      const now = new Date();
      const t = now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");
      setLogs(prev => [{ time: t, source: testForm.source, name: testForm.name, email: testForm.email, score, status: "ok" }, ...prev]);
      setSources(prev => prev.map(s => s.id === testForm.source ? { ...s, today: s.today + 1, total: s.total + 1, lastLead: "עכשיו" } : s));
    }, 800);
  };

  const toggleSource = (id) => setSources(p => p.map(s => s.id === id ? { ...s, status: s.status === "active" ? "inactive" : "active" } : s));
  const filteredLogs = logs.filter(l => (logFilter === "all" || l.source === logFilter) && (logStatus === "all" || l.status === logStatus));

  const STATUS_BADGE = {
    ok: <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: "#EAF3DE", color: "#3B6D11" }}>נכנס</span>,
    dup: <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: "#FAEEDA", color: "#854F0B" }}>כפיל</span>,
    err: <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: "#FCEBEB", color: "#A32D2D" }}>שגיאה</span>,
  };

  const TABS = [{ id: "sources", label: "מקורות" }, { id: "mapping", label: "מיפוי שדות" }, { id: "log", label: "יומן לידים" }, { id: "webhook", label: "Webhook / API" }, { id: "test", label: "בדיקת חיבור" }];
  const tabStyle = (id) => ({ padding: "7px 14px", borderRadius: 7, border: `1px solid ${tab === id ? NAVY : BORDER}`, background: tab === id ? NAVY : WHITE, color: tab === id ? WHITE : TEXT, fontSize: 11, fontWeight: tab === id ? 700 : 500, cursor: "pointer", fontFamily: "inherit" });
  const mappingSrc = sources.find(s => s.id === mappingSource);

  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>🔌 אינטגרציות לידים</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>חיבור מקורות חיצוניים → רשימת הלידים</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Stat label="מקורות פעילים" value={activeCount} color={OK} />
          <Stat label="לידים היום" value={todayTotal} color={BLUE} />
          <Stat label="סה״כ" value={totalAll} color={NAVY} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(t.id)}>{t.label}</button>)}
      </div>

      {tab === "sources" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginBottom: 14 }}>
            {sources.map(s => (
              <div key={s.id} onClick={() => setSelId(selId === s.id ? null : s.id)}
                style={{ background: WHITE, border: `${selId === s.id ? "2px" : "1px"} solid ${selId === s.id ? NAVY : BORDER}`, borderRadius: 10, padding: 14, cursor: "pointer" }}
                onMouseEnter={e => { if (selId !== s.id) e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,.06)"; }}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: s.colorBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{s.icon}</div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: s.status === "active" ? "#EAF3DE" : SURF, color: s.status === "active" ? OK : MUTED }}>{s.status === "active" ? "פעיל" : "כבוי"}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 12, color: TEXT, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>{s.method}</div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: BLUE }}>{s.today}</div><div style={{ fontSize: 9, color: MUTED }}>היום</div></div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{s.total}</div><div style={{ fontSize: 9, color: MUTED }}>סה״כ</div></div>
                  <div style={{ fontSize: 10, color: MUTED, alignSelf: "flex-end" }}>{s.lastLead}</div>
                </div>
              </div>
            ))}
          </div>
          {sel && (
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>הגדרות: {sel.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: MUTED }}>סטטוס:</span>
                  <div onClick={() => toggleSource(sel.id)} style={{ width: 36, height: 20, borderRadius: 10, background: sel.status === "active" ? OK : BORDER, cursor: "pointer", position: "relative" }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: WHITE, position: "absolute", top: 3, left: sel.status === "active" ? 19 : 3, transition: "left 0.2s" }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: sel.status === "active" ? OK : MUTED }}>{sel.status === "active" ? "פעיל" : "כבוי"}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>שיטת קליטה</div><div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{sel.method}</div></div>
                <div>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>שדות נכנסים</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {sel.inFields.map(f => <span key={f} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8, background: SURF, color: TEXT, border: `1px solid ${BORDER}` }}>{f}</span>)}
                  </div>
                </div>
              </div>
              {sel.method === "Webhook" && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 5 }}>Webhook URL:</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input readOnly value={sel.webhookUrl} style={{ flex: 1, padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 11, background: SURF, color: TEXT, fontFamily: "monospace", outline: "none" }} />
                    <Btn onClick={() => {}} variant="secondary" sm>העתק</Btn>
                  </div>
                </div>
              )}
              {sel.method === "API Polling" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>תדירות משיכה</div><Select value={sel.pollInterval || "כל שעה"} onChange={() => {}} options={["כל 5 דקות", "כל 15 דקות", "כל שעה", "כל 6 שעות"].map(x => ({ value: x, label: x }))} style={{ width: "100%" }} /></div>
                  {sel.id === "facebook" && <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Page Access Token</div><Input value={sel.accessToken || ""} onChange={() => {}} placeholder="EAAxxxxx..." style={{ width: "100%" }} /></div>}
                  {sel.id === "google" && <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Customer ID</div><Input value={sel.customerId || ""} onChange={() => {}} placeholder="123-456-7890" style={{ width: "100%" }} /></div>}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => { setSources(p => p.map(s => s.id === sel.id ? { ...s, status: "active" } : s)); alert("הגדרות נשמרו!"); }}>שמור הגדרות</Btn>
                <Btn onClick={() => setTab("mapping")} variant="secondary">ערוך מיפוי שדות</Btn>
                <Btn onClick={() => setTab("test")} variant="secondary">בדוק חיבור</Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "mapping" && (
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>מיפוי שדות נכנסים → שדות CRM</div>
            <Select value={mappingSource} onChange={setMappingSource} options={sources.map(s => ({ value: s.id, label: s.label }))} style={{ width: 180 }} />
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>שדה מקור ({mappingSrc?.label})</div>
              <div />
              <div style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>שדה CRM</div>
            </div>
            {(mappingSrc?.inFields || []).map(f => (
              <div key={f} style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <div style={{ padding: "7px 10px", background: SURF, borderRadius: 7, fontSize: 12, color: TEXT, border: `1px solid ${BORDER}` }}>{f}</div>
                <div style={{ textAlign: "center", color: MUTED, fontSize: 14 }}>→</div>
                <Select value={mappingSrc?.mapping?.[f] || ""} onChange={() => {}} options={[{ value: "", label: "-- לא ממופה --" }, ...CRM_FIELDS_MAP.map(c => ({ value: c, label: c }))]} style={{ width: "100%" }} />
              </div>
            ))}
            <div style={{ marginTop: 8, padding: "10px 12px", background: SURF, borderRadius: 7, fontSize: 11, color: MUTED }}>שדות לא ממופים ישמרו בעמודת "הערות" של הליד.</div>
            <div style={{ marginTop: 12 }}><Btn onClick={() => alert("מיפוי נשמר!")}>שמור מיפוי</Btn></div>
          </div>
        </div>
      )}

      {tab === "log" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <Select value={logFilter} onChange={setLogFilter} options={[{ value: "all", label: "כל המקורות" }, { value: "website", label: "אתר" }, { value: "facebook", label: "פייסבוק" }, { value: "google", label: "Google" }, { value: "whatsapp", label: "WhatsApp" }]} style={{ width: 140 }} />
            <Select value={logStatus} onChange={setLogStatus} options={[{ value: "all", label: "כל הסטטוסים" }, { value: "ok", label: "נכנס בהצלחה" }, { value: "dup", label: "כפיל" }, { value: "err", label: "שגיאה" }]} style={{ width: 140 }} />
            <div style={{ flex: 1 }} />
            <Btn onClick={addSimLead} variant="secondary">+ סימולציית ליד נכנס</Btn>
          </div>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "80px 80px 1fr 60px 70px", gap: 8, padding: "8px 12px", background: SURF, borderBottom: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, color: MUTED }}>
              <div>זמן</div><div>מקור</div><div>שם / מייל</div><div>ציון AI</div><div>סטטוס</div>
            </div>
            {filteredLogs.length === 0 && <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12 }}>אין רשומות תואמות</div>}
            {filteredLogs.map((l, i) => {
              const sc = l.score >= 80 ? OK : l.score >= 60 ? WARN : MUTED;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 80px 1fr 60px 70px", gap: 8, padding: "9px 12px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.style.background = SURF} onMouseLeave={e => e.currentTarget.style.background = WHITE}>
                  <div style={{ color: MUTED }}>{l.time}</div>
                  <div><span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: "#E6F1FB", color: "#185FA5" }}>{SOURCE_LABEL[l.source] || l.source}</span></div>
                  <div><div style={{ fontWeight: 700, color: TEXT }}>{l.name}</div><div style={{ color: MUTED }}>{l.email}</div></div>
                  <div style={{ fontWeight: 700, color: sc }}>{l.score || "—"}</div>
                  <div>{STATUS_BADGE[l.status]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "webhook" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 10 }}>Webhook נכנס — שליחה מהאתר</div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>שלח POST לכתובת הבאה מכל טופס:</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, background: SURF, borderRadius: 7, padding: 10, color: TEXT, marginBottom: 10, border: `1px solid ${BORDER}`, lineHeight: 1.7, whiteSpace: "pre" }}>{"POST https://api.salesflow.co.il/v1/leads\nAuthorization: Bearer YOUR_API_KEY\nContent-Type: application/json"}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT, marginBottom: 6 }}>API Key:</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input readOnly value="sf_live_k7x9m2p4q8r..." style={{ flex: 1, padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 11, background: SURF, fontFamily: "monospace", outline: "none" }} />
                <Btn onClick={() => {}} variant="secondary" sm>העתק</Btn>
              </div>
            </div>
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 10 }}>Payload לדוגמה</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, background: SURF, borderRadius: 7, padding: 10, color: TEXT, border: `1px solid ${BORDER}`, lineHeight: 1.8, whiteSpace: "pre" }}>{`{\n  "name": "ישראל ישראלי",\n  "email": "user@example.com",\n  "phone": "052-1234567",\n  "source": "website",\n  "notes": "מתעניין בחבילה עסקית"\n}`}</div>
            </div>
          </div>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 10 }}>קוד Embed לאתר (HTML)</div>
            <div style={{ fontFamily: "monospace", fontSize: 11, background: SURF, borderRadius: 7, padding: 12, color: TEXT, border: `1px solid ${BORDER}`, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{`<form id="sf-form" onsubmit="sfSubmit(event)">\n  <input name="name" placeholder="שם מלא" required />\n  <input name="email" type="email" placeholder="מייל" required />\n  <input name="phone" placeholder="טלפון" />\n  <button type="submit">שלח</button>\n</form>\n<script>\nasync function sfSubmit(e) {\n  e.preventDefault();\n  const data = Object.fromEntries(new FormData(e.target));\n  await fetch("https://api.salesflow.co.il/v1/leads", {\n    method: "POST",\n    headers: { Authorization: "Bearer sf_live_***" },\n    body: JSON.stringify({...data, source: "website"})\n  });\n}\n<\\/script>`}</div>
          </div>
        </div>
      )}

      {tab === "test" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 14 }}>שלח ליד בדיקה — יכנס ישירות לרשימת הלידים</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <Field label="שם:"><Input value={testForm.name} onChange={v => setTestForm(p => ({ ...p, name: v }))} style={{ width: "100%" }} /></Field>
              <Field label="מייל:"><Input value={testForm.email} onChange={v => setTestForm(p => ({ ...p, email: v }))} style={{ width: "100%" }} /></Field>
              <Field label="טלפון:"><Input value={testForm.phone} onChange={v => setTestForm(p => ({ ...p, phone: v }))} style={{ width: "100%" }} /></Field>
              <Field label="מקור:"><Select value={testForm.source} onChange={v => setTestForm(p => ({ ...p, source: v }))} options={sources.map(s => ({ value: s.id, label: s.label }))} style={{ width: "100%" }} /></Field>
            </div>
            <div style={{ marginBottom: 12 }}><Field label="הערות:"><Input value={testForm.notes} onChange={v => setTestForm(p => ({ ...p, notes: v }))} placeholder="אופציונלי..." style={{ width: "100%" }} /></Field></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Btn onClick={runTest}>{testLoading ? "שולח..." : "שלח ליד בדיקה"}</Btn>
              {testResult && <span style={{ fontSize: 11, color: OK, fontWeight: 600 }}>✓ ליד נוסף בהצלחה לרשימת הלידים!</span>}
            </div>
          </div>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 10 }}>תגובת מערכת (JSON)</div>
            <div style={{ fontFamily: "monospace", fontSize: 11, background: SURF, borderRadius: 7, padding: 12, color: TEXT, border: `1px solid ${BORDER}`, minHeight: 80, lineHeight: 1.8, whiteSpace: "pre" }}>
              {testResult ? JSON.stringify(testResult, null, 2) : "ממתין לבדיקה..."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NAV + MAIN APP ───────────────────────────────────────────────────────────

const NAV = [
  { id: "dashboard", icon: "⊞", label: "לוח בקרה" },
  { id: "leads", icon: "⚡", label: "לידים" },
  { id: "pipeline", icon: "◫", label: "Pipeline" },
  { id: "clients", icon: "🏢", label: "לקוחות" },
  { id: "projects", icon: "📁", label: "פרויקטים" },
  { id: "contacts", icon: "👤", label: "אנשי קשר" },
  { id: "analytics", icon: "📊", label: "אנליטיקס" },
  { id: "automations", icon: "🔄", label: "אוטומציות" },
  { id: "calendar", icon: "📅", label: "יומן" },
  { id: "tasks", icon: "✅", label: "משימות" },
  { id: "integrations", icon: "🔌", label: "אינטגרציות" },
  { id: "import", icon: "⬆", label: "שאיבת תוכן" },
  { id: "users", icon: "⚙", label: "משתמשים" },
  { id: "ai", icon: "✦", label: "AI Assistant" },
];

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────

function LoginScreen({ users, onLogin }) {
  const [selId, setSelId] = useState(null);
  const [error, setError] = useState("");

  const activeUsers = users.filter(u => u.active);
  const isAdmin = (u) => u.role === "מנהל מערכת";

  const handleLogin = () => {
    if (!selId) { setError("בחר משתמש להתחברות"); return; }
    const user = users.find(u => u.id === selId);
    if (user) onLogin(user);
  };

  return (
    <div style={{ height: "100vh", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI','Helvetica Neue',Arial,sans-serif", direction: "rtl" }}>
      <div style={{ background: WHITE, borderRadius: 16, padding: 36, width: 420, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: NAVY, letterSpacing: -0.5 }}>SalesFlow CRM</div>
          <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, letterSpacing: 1, marginTop: 2 }}>Shiluv I²R</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 10 }}>בחר את המשתמש שלך להתחברות</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {activeUsers.map(u => (
            <div key={u.id} onClick={() => { setSelId(u.id); setError(""); }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: `2px solid ${selId === u.id ? NAVY : BORDER}`, background: selId === u.id ? "#F0F4FF" : WHITE, cursor: "pointer", transition: "all .15s" }}
              onMouseEnter={e => { if (selId !== u.id) e.currentTarget.style.borderColor = MUTED; }}
              onMouseLeave={e => { if (selId !== u.id) e.currentTarget.style.borderColor = BORDER; }}>
              <Av name={u.name} size={38} color={isAdmin(u) ? GOLD : NAVY} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: TEXT, fontSize: 13 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{u.role}</div>
              </div>
              {isAdmin(u) && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: GOLD + "22", color: WARN }}>מנהל</span>
              )}
              {selId === u.id && (
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: WHITE, fontSize: 11 }}>✓</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <div style={{ fontSize: 12, color: ERR, marginBottom: 10, textAlign: "center" }}>{error}</div>}

        <button onClick={handleLogin}
          style={{ width: "100%", padding: "13px 0", background: NAVY, color: WHITE, border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
          כניסה למערכת
        </button>
        <div style={{ fontSize: 11, color: MUTED, textAlign: "center", marginTop: 12 }}>
          ← זהו מוקאפ עיצובי. בגרסה הייצורית יהיה אימות מלא.
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function SalesFlowCRM() {
  const [currentUser, setCurrentUser] = useState(null);
  const [impersonating, setImpersonating] = useState(null); // user obj when admin views as another
  const [view, setView] = useState("dashboard");
  const [leads, setLeads] = useState(initLeads);
  const [deals, setDeals] = useState(initDeals);
  const [contacts, setContacts] = useState(initContacts);
  const [clients, setClients] = useState(initClients);
  const [clientContacts, setClientContacts] = useState(initClientContacts);
  const [projects, setProjects] = useState(initProjects);
  const [tasks, setTasks] = useState(initTasks);
  const [calendarEvents, setCalendarEvents] = useState(initCalendarEvents);
  const [users, setUsers] = useState(initUsers);
  const [autos, setAutos] = useState(initAutos);

  // The "active" user is the impersonated one (if any), otherwise currentUser
  const activeUser = impersonating || currentUser;
  const isAdmin = currentUser?.role === "מנהל מערכת";
  const isImpersonating = !!impersonating;

  const handleLogin = (user) => {
    setCurrentUser(user);
    setImpersonating(null);
    setView("dashboard");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setImpersonating(null);
    setView("dashboard");
  };

  const startImpersonate = (user) => {
    setImpersonating(user);
    setView("dashboard");
  };

  const stopImpersonate = () => {
    setImpersonating(null);
    setView("dashboard");
  };

  // Filter data by assignee for non-admin users (or when impersonating)
  const filterByUser = (items, key = "assignee") => {
    if (!activeUser) return items;
    if (isAdmin && !isImpersonating) return items; // admin sees all
    return items.filter(item => item[key] === activeUser.name);
  };

  const visibleLeads = filterByUser(leads);
  const visibleDeals = filterByUser(deals);
  const visibleClients = filterByUser(clients);
  const visibleTasks = filterByUser(tasks);

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} />;
  }

  // Admin-only nav items
  const visibleNav = NAV.filter(item => {
    if (!isAdmin && !isImpersonating) {
      return !["users", "automations", "integrations", "import"].includes(item.id);
    }
    return true;
  });

  const views = {
    dashboard: <Dashboard deals={visibleDeals} leads={visibleLeads} tasks={visibleTasks} />,
    leads: <LeadsView leads={visibleLeads} setLeads={setLeads} />,
    pipeline: <PipelineView deals={visibleDeals} setDeals={setDeals} />,
    clients: <ClientsView clients={visibleClients} setClients={setClients} clientContacts={clientContacts} setClientContacts={setClientContacts} deals={visibleDeals} />,
    projects: <ProjectsView projects={projects} setProjects={setProjects} clients={clients} />,
    contacts: <ContactsView contacts={contacts} setContacts={setContacts} clients={clients} clientContacts={clientContacts} setClientContacts={setClientContacts} />,
    analytics: <AnalyticsView deals={visibleDeals} />,
    automations: <AutomationsView autos={autos} setAutos={setAutos} />,
    calendar: <CalendarView events={calendarEvents} setEvents={setCalendarEvents} activeUser={activeUser} isAdminView={isAdmin && !isImpersonating} />,
    tasks: <TasksView tasks={visibleTasks} setTasks={setTasks} />,
    import: <ImportView />,
    integrations: <IntegrationsView leads={leads} setLeads={setLeads} />,
    users: <UsersView users={users} setUsers={setUsers} onImpersonate={startImpersonate} currentUser={currentUser} />,
    ai: <AIView leads={visibleLeads} deals={visibleDeals} />,
  };

  // Ensure current view is accessible
  const safeView = visibleNav.find(n => n.id === view) ? view : "dashboard";

  return (
    <div style={{ display: "flex", height: "100vh", background: SURF, fontFamily: "'Segoe UI','Helvetica Neue',Arial,sans-serif", direction: "rtl", color: TEXT, fontSize: 13 }}>

      {/* Impersonation Banner */}
      {isImpersonating && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, background: WARN, color: WHITE, padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
          <span>👁 אתה צופה כ: {impersonating.name} ({impersonating.role}) — מוצגים רק הנתונים שלו</span>
          <button onClick={stopImpersonate} style={{ background: WHITE, color: WARN, border: "none", borderRadius: 6, padding: "4px 12px", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            ← חזור למנהל
          </button>
        </div>
      )}

      <div style={{ display: "flex", width: "100%", height: "100%", paddingTop: isImpersonating ? 36 : 0 }}>
        {/* Sidebar */}
        <div style={{ width: 190, background: NAVY, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid " + BLUE }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: WHITE }}>SalesFlow</div>
            <div style={{ fontSize: 9, color: GOLD, fontWeight: 600, letterSpacing: 1 }}>CRM · Shiluv I²R</div>
          </div>

          <nav style={{ flex: 1, padding: "8px 7px", display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
            {visibleNav.map(item => {
              const active = safeView === item.id;
              return (
                <button key={item.id} onClick={() => setView(item.id)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 9px", borderRadius: 6, border: "none", background: active ? GOLD : "transparent", color: active ? NAVY : "#9DB5D8", cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 500, width: "100%", textAlign: "right", fontFamily: "inherit", whiteSpace: "nowrap" }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = BLUE; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ fontSize: 13, width: 16, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User footer */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid " + BLUE }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isAdmin && !isImpersonating ? 8 : 0 }}>
              <Av name={activeUser.name} size={26} color={isAdmin && !isImpersonating ? GOLD : NAVY} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: WHITE, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeUser.name}</div>
                <div style={{ fontSize: 9, color: MUTED }}>{activeUser.role}</div>
              </div>
            </div>
            <button onClick={handleLogout}
              style={{ width: "100%", padding: "5px 0", background: "transparent", border: `1px solid ${BLUE}`, borderRadius: 6, color: MUTED, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
              התנתקות
            </button>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ height: 42, background: WHITE, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: MUTED }}>
              {visibleNav.find(n => n.id === safeView)?.icon} {visibleNav.find(n => n.id === safeView)?.label}
              {(!isAdmin || isImpersonating) && (
                <span style={{ marginRight: 10, fontSize: 10, background: NAVY + "22", color: NAVY, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                  מציג: הנתונים של {activeUser.name}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ fontSize: 11, color: MUTED }}>אפריל 2026</div>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: OK }} />
              <div style={{ fontSize: 11, color: OK, fontWeight: 600 }}>מחובר</div>
            </div>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>{views[safeView]}</div>
        </div>
      </div>
    </div>
  );
}
