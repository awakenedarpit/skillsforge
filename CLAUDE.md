# SkillsForge: Master Repository Rules (QuikIT Monorepo)

## Stack
- **Framework:** Next.js 14.0.4, App Router (Server Components + Route Handlers). Pinned.
- **Language:** TypeScript, strict mode.
- **Monorepo:** Turborepo 2.0 + npm workspaces (`apps/*`, `packages/*`).
- **Database:** PostgreSQL 14+ via Prisma 5.7+ (`multiSchema`), models live in schema `app_skillsforge`.
- **Auth:** NextAuth 4.24, JWT session (`id, email, name, orgId, membershipRole, isSuperAdmin`).
- **Validation:** Zod client and server.
- **UI:** React 18.3.1 (pinned) + Tailwind CSS 3 + Radix primitives.
- **Data fetching:** TanStack Query v5 for client interactions.
- **Icons:** lucide-react only (no emoji in UI).
- **Tests:** Vitest + Testing Library + jsdom; Playwright for E2E.
- **Mode:** Mode B (Local stand-ins for `@quikit/*` under `apps/skillsforge/shims/quikit/`).

## Hard Rules
1. Every route handler is wrapped in `withOrgAuth` or `requireAdmin`.
2. Zod validates every body, query string, and route param.
3. Every Prisma query filters by `orgId` taken from session, never from client input.
4. Response envelope only: `{ success: true, data: ... }` or `{ success: false, error: "..." }`.
5. Status codes: GET/PATCH/DELETE 200, POST create 201, 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict.
6. Every mutation writes an audit log (`writeAuditLog`).
7. List queries use `select`, have `take`, and use standard pagination utilities.
8. Server components by default; `"use client"` only for leaf interactive components.
9. Frozen provider order: `SessionProvider -> QueryClientProvider -> ThemeProvider -> ConfirmProvider -> LocaleProvider`.
10. At least 3 tests per route: unauthenticated (401), cross-org rejected (404), happy path (200/201), plus Zod 400 on input.
