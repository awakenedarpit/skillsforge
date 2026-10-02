# SkillsForge progress
Mode: B     Branch: feature/skillsforge-recovery     Last updated: 2026-10-02 15:15 IST

## Milestones
- [x] **M0 Safety, audit, decisions** (`7633ba5` backup branch created, audit and assumptions written)
- [x] **M1 Clean-up and scaffold** (`fbaae35` wrong-stack removed, Turbo 2.0+workspaces, Mode B shims, i18n skeleton, lint/typecheck/tests 100% green)
- [x] **M2 Data layer** (Prisma schema with multiSchema `app_skillsforge`, pure domain functions, 100% domain tests, seed & seed:verify with 10/10 story checks green)
- [ ] **M3 API foundation** (next: withOrgAuth, requireAdmin, validationError, auditLog, permissions, operators/machines CRUD, dev login)
- [ ] **M4 Skill Grid and History (C1, B2)**
- [ ] **M5 Heatmap, expiry job, alerts (C2, C3, B3, B4)**
- [ ] **M6 Assignment and reports (C4, B5)**
- [ ] **M7 ACCEPTANCE GATE (D1-D4 tests & verification)**
- [ ] **M8 MVP features (MVP-1 simulator, MVP-2 forecast, MVP-3 alternatives & workload)**
- [ ] **M9 Bilingual completion audit**
- [ ] **M10 Final verification and docs**

## Right now
1. Implement `apps/skillsforge/lib/api/withOrgAuth.ts`, `requireAdmin.ts`, `validationError.ts`, `auditLog.ts`, `skillsforgePermissions.ts`.
2. Implement route handlers: `GET /api/health`, `GET /api/meta`, `GET/POST /api/operators`, `GET/PATCH/DELETE /api/operators/[id]`, `GET/POST /api/skills`, `GET/PATCH/DELETE /api/skills/[id]`.
3. Setup NextAuth dev credentials login route (`app/api/auth/[...nextauth]/route.ts`) and `/login` page with 3 seeded demo personas.
4. Author route tests in `__tests__/api/` (unauthenticated 401, cross-org 404, Zod 400, happy path).

## Verified
- Git backup branch `backup/pre-recovery` created and baseline committed (`f5afb68`).
- Active working branch: `feature/skillsforge-recovery`.
- Wrong-stack code removed (`backend/`, `frontend/`, `scripts/`, `apps/web/`).
- Root Turborepo 2.0 and npm workspaces configured with `packageManager: npm@11.19.1`.
- Mode B stand-ins created under `shims/quikit/{auth,database,shared,ui,redis}`.
- Pinned Next.js 14.0.4 + React 18.3.1 installed.
- Bilingual i18n skeleton created (`en.json` & `hi.json` with 100% key parity).
- `vitest run` passed: 22/22 tests green across domain and i18n suites.
- `tsc --noEmit` passed: 0 type errors.
- `next lint` passed: 0 ESLint warnings or errors.
- `npm run seed:verify` passed: 10/10 story rules verified (5 red, 5 amber, 14 green; QA-8 SPOF & top risk; WLD-6 shift B/C red; exactly 6 trainers; Ravi removal turning 2 cells red; 5 expiring certs at 3,9,14,22,28 days; 1 overdue at -5 days; 45 assignments with top 3 >= 2x median; groupBy total matches pivot totals).

## Known issues / decisions / assumptions
- Mode B chosen because `@quikit/*` shared packages are not provided externally; thin local shims are implemented.
- Windows environment: command execution via `cmd /c` to bypass PowerShell script execution policy.
- Local PostgreSQL service on 5432 is currently down. `seed.ts` handles connectivity gracefully with clear warning, while `seed:verify` and domain functions run 100% offline.

## How to resume
```bash
git checkout feature/skillsforge-recovery
npm install
npm run dev
```
