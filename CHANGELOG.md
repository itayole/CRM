# SalesFlow CRM — Changelog

All changes to this project are documented here, in reverse-chronological order.

---

## [e2cb111] — Dynamic SQL Server port discovery
**Date:** 2026-05-04

### Problem
The SQL Server instance (`MFILES_SQL`) is a **named instance**, which never
listens on port 1433. It uses a dynamic port assigned at startup — port 1433
is reserved for the SQL Server default instance only. Hardcoding the port (e.g.
`61754`) would break silently every time the SQL Server service restarted.

### Solution
Query the **SQL Browser service (UDP 1434)** at runtime to discover the current
TCP port — the same mechanism used by Power Query, SSMS, and other Windows tools.
The port is resolved once per process start and never stored.

### Files changed
| File | Change |
|---|---|
| `src/lib/sql-browser.ts` | UDP 1434 query helper — sends `CLNT_UCAST_INST` request, parses `tcp;PORT` from response |
| `src/instrumentation.ts` | Next.js server hook (runs once before any route) — resolves instance name → port and patches `process.env.DATABASE_URL` in-process |
| `scripts/resolve-port.mjs` | Same discovery logic for CLI commands (`db:push`, `db:migrate`, `db:studio`). Uses Node 24 built-in `process.loadEnvFile()` — no `dotenv` package needed |
| `package.json` | `db:push`, `db:migrate`, `db:studio` scripts now route through `resolve-port.mjs` |
| `.env.example` | Updated `DATABASE_URL` format to use instance name instead of port |

### DATABASE_URL format
```
# Before (fragile — breaks when SQL Server restarts)
DATABASE_URL="sqlserver://172.28.10.2:61754;database=SalesFlowCRM;..."

# After (resilient — port resolved at runtime)
DATABASE_URL="sqlserver://172.28.10.2\MFILES_SQL;database=SalesFlowCRM;..."
```

---

## [b25a5cc] — Upgrade to Next.js 15 + runtime fixes
**Date:** 2026-05-04

### Security
Upgraded `next` 14 → **15.5.15** and `eslint-config-next` to match, resolving
4 high-severity CVEs:

| CVE | Description |
|---|---|
| GHSA-9g9p-9gw9-jx7f | DoS via Image Optimizer `remotePatterns` |
| GHSA-h25m-26qc-wcjf | HTTP request deserialization DoS in RSC |
| GHSA-ggv3-7p47-pfv8 | HTTP request smuggling via rewrites |
| GHSA-q4gf-8mx6-v5v3 | DoS with Server Components |

2 moderate CVEs remain (PostCSS inside `next`'s own bundle, `uuid` inside
`next-auth`) — their "fixes" would downgrade to broken versions and are not
exploitable in this codebase.

### Breaking changes handled (Next.js 15)
- **`params` is now a `Promise`** — all `[id]` route handlers updated:
  `{ params: { id: string } }` → `{ params: Promise<{ id: string }> }` with `await params`
- **`serverComponentsExternalPackages` moved** — renamed from
  `experimental.serverComponentsExternalPackages` to top-level `serverExternalPackages`
  in `next.config.ts`

### Prisma schema — MSSQL cascade path fix
MSSQL does not allow multiple cascade paths to the same table. `Deal` and
`Project` were each reachable from `User` via two paths:
1. Direct: `User → Deal.assigneeId`
2. Indirect: `User → Client.assigneeId → Client → Deal.clientId`

Fixed by adding `onDelete: NoAction, onUpdate: NoAction` to **all** User-facing
relations. This is also correct business logic — deleting a user who still owns
records should be blocked at the database level.

### Middleware fixes
- `withAuth` now receives `pages: { signIn: "/login" }` so unauthenticated
  requests redirect to `/login` instead of NextAuth's default `/api/auth/signin`
- `/api/health` exempted from the auth matcher (used by Docker healthcheck)

### Files changed
`next.config.ts` · `package.json` · `package-lock.json` · `prisma/schema.prisma` ·
`src/app/api/leads/[id]/route.ts` · `src/app/api/clients/[id]/route.ts` ·
`src/app/api/deals/[id]/route.ts` · `src/middleware.ts` · `tsconfig.json`

---

## [60c7b06] — Align Node.js version to v24
**Date:** 2026-05-04

- `Dockerfile`: base image `node:20-alpine` → `node:24-alpine`
- `package.json`: added `"engines": { "node": ">=24.0.0" }` to warn if run on
  an older version

---

## [05d9ae3] — Add .gitattributes for consistent line endings
**Date:** 2026-05-04

All text files normalized to **LF** on commit and checkout across platforms.
Windows batch/PowerShell scripts (`.bat`, `.cmd`, `.ps1`) keep CRLF.
Binary assets (images, fonts, archives) excluded from line-ending conversion.

Prevents the CRLF warnings that appeared on every `git commit` on Windows.

---

## [31b6bca] — Initial scaffold
**Date:** 2026-05-04

Full project scaffold generated from `SalesFlow_CRM_Annotated.jsx` — the
authoritative UI mockup and data model source.

### Stack
| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router, TypeScript, Tailwind CSS |
| ORM | Prisma 5 with `sqlserver` provider |
| Auth | NextAuth v4, CredentialsProvider, JWT strategy |
| Deploy | Docker Compose (app only — MSSQL is external) |

### Prisma schema — 10 models
Derived directly from the annotations in `SalesFlow_CRM_Annotated.jsx`:

| Model | Table | Notes |
|---|---|---|
| `User` | `users` | `role`: `"admin"` \| `"sales_rep"` |
| `Lead` | `leads` | Phone dedup on ingest; `activity` as JSON string |
| `Deal` | `deals` | Soft-linked to `clients` via denormalized `company` |
| `Client` | `clients` | |
| `ClientContact` | `client_contacts` | Cascade-deleted with client |
| `Project` | `projects` | `tags` as JSON string |
| `ProjectPhase` | `project_phases` | Cascade-deleted with project |
| `Task` | `tasks` | |
| `CalendarEvent` | `calendar_events` | `gcEventId` for Google Calendar sync |
| `Automation` | `automations` | |
| `LeadIntegration` | `lead_integrations` | `accessToken` AES-256 encrypted at app layer |

All `NVarChar` fields for Hebrew text support. Monetary values `Decimal(18,2)`.
Dates stored as `DATETIME2` UTC.

### API routes
All routes enforce RBAC server-side: `admin` sees all records, `sales_rep` sees
only records where `assigneeId = session.user.id`.

| Route | GET | POST | PATCH | DELETE |
|---|---|---|---|---|
| `/api/leads` | Paginated, filterable | Dedup check → 409 if duplicate | — | — |
| `/api/leads/[id]` | Assignee-scoped | — | sales_rep cannot reassign | Admin only |
| `/api/clients` | With contacts + counts | — | — | — |
| `/api/clients/[id]` | Assignee-scoped | — | sales_rep cannot reassign | Admin only |
| `/api/deals` | Paginated by stage | — | — | — |
| `/api/deals/[id]` | Assignee-scoped | — | sales_rep cannot reassign | Admin only |
| `/api/health` | Always 200 `{"status":"ok"}` | — | — | — |

### Auth
- `src/lib/auth.ts` — `CredentialsProvider`: bcrypt password verify, updates
  `lastLogin` on sign-in
- `src/types/next-auth.d.ts` — augments `Session` and `JWT` with `id` and `role`
- `src/middleware.ts` — `withAuth` wrapper protects all routes; admin-only paths
  return 403 to non-admins

### Docker
- `Dockerfile` — multi-stage build → `standalone` output (minimal runtime image)
- `docker-compose.yml` — app service only; `host.docker.internal` extra_host lets
  the container reach the host machine's SQL Server
- `NEXTAUTH_SECRET`, `DATABASE_URL` injected via environment at runtime

### Files created (29)
`.claude/launch.json` · `.env.example` · `.gitignore` · `Dockerfile` ·
`SalesFlow_CRM_Annotated.jsx` · `docker-compose.yml` · `next.config.ts` ·
`package.json` · `package-lock.json` · `postcss.config.js` ·
`prisma/schema.prisma` · `src/app/api/auth/[...nextauth]/route.ts` ·
`src/app/api/clients/[id]/route.ts` · `src/app/api/clients/route.ts` ·
`src/app/api/deals/[id]/route.ts` · `src/app/api/deals/route.ts` ·
`src/app/api/health/route.ts` · `src/app/api/leads/[id]/route.ts` ·
`src/app/api/leads/route.ts` · `src/app/globals.css` · `src/app/layout.tsx` ·
`src/app/providers.tsx` · `src/lib/auth.ts` · `src/lib/prisma.ts` ·
`src/middleware.ts` · `src/types/next-auth.d.ts` · `tailwind.config.ts` ·
`tsconfig.json`
