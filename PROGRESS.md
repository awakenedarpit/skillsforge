# SkillsForge progress
Mode: B     Branch: feature/skillsforge-recovery     Last updated: 2026-10-02 15:37 IST

## Milestones
- [x] **M0 Safety, audit, decisions** (`7633ba5` backup branch created, audit and assumptions written)
- [x] **M1 Clean-up and scaffold** (`fbaae35` wrong-stack removed, Turbo 2.0+workspaces, Mode B shims, i18n skeleton, lint/typecheck/tests 100% green)
- [x] **M2 Data layer** (`804637e` Prisma schema with multiSchema `app_skillsforge`, pure domain functions, 100% domain tests, seed & seed:verify with 10/10 story checks green)
- [x] **M3 API foundation** (`be319aa` withOrgAuth, requireAdmin, validationError, auditLog, permissions, health, meta, operators CRUD, skills CRUD, dev login & /login page, 41/41 tests green)
- [x] **M4 Skill Grid and History (C1, B2)** (`0420a60` GET /api/grid, PATCH/DELETE /api/operator-skills, GET /api/history, /grid UI with 2-D matrix, inline Popover level edit 0-4, keyboard shortcuts, history SlidePanel, 49/49 tests green)
- [x] **M5 Heatmap, expiry job, alerts (C2, C3, B3, B4)** (`e9c0b1a` GET /api/coverage, GET /api/alerts, POST /api/jobs/expiry-check, GET /api/jobs/runs, dashboard Coverage Heatmap with pulsing red glow, live Alert Panel with days remaining, Admin "Run check now", 59/59 tests green)
- [ ] **M6 Assignment and reports (C4, B5)** (next: GET /api/assignments/check, POST/GET /api/assignments, GET /api/workload, GET /api/reports/gaps, GET /api/reports/verdict, /assign, /reports/gaps, /reports/verdict)
- [ ] **M7 ACCEPTANCE GATE (D1-D4 tests & verification)**
- [ ] **M8 MVP features (MVP-1 simulator, MVP-2 forecast, MVP-3 alternatives & workload)**
- [ ] **M9 Bilingual completion audit**
- [ ] **M10 Final verification and docs**

## Right now
1. Implement M6 Assignment and Reports:
   - `GET /api/assignments/check?operatorId=&skillId=&assignmentDate=&shiftId=` (returns green/red verdict, all blocking reasons, warnings, top 3 alternatives).
   - `POST /api/assignments` (201 on green/accepted, 409 on red/rejected with reasons).
   - `GET /api/assignments` (paginated list).
   - `GET /api/workload?days=14` (accepted assignments per operator, median, overloaded flag).
   - `GET /api/reports/gaps?asOf=` (gap report with SPOFs from DB groupBy, red cells, risk scores).
   - `GET /api/reports/verdict` (printable verdict payload).
2. Build UI pages for M6:
   - `app/(dashboard)/assign/page.tsx` (live check, verdict card, alternatives, 409 rejection display).
   - `app/(dashboard)/reports/page.tsx` & `reports/gaps/page.tsx` (printable gap report, risk scores, client CSV export).
   - `app/(dashboard)/reports/verdict/page.tsx` (printable verdict certificate).
3. Author route tests in `__tests__/api/assignments.test.ts` and `__tests__/api/reports.test.ts`.

## Verified
- Git backup branch `backup/pre-recovery` created and baseline committed (`f5afb68`).
- Active working branch: `feature/skillsforge-recovery`.
- Wrong-stack code removed (`backend/`, `frontend/`, `scripts/`, `apps/web/`).
- Root Turborepo 2.0 and npm workspaces configured with `packageManager: npm@11.19.1`.
- Mode B stand-ins created under `shims/quikit/{auth,database,shared,ui,redis}`.
- Pinned Next.js 14.0.4 + React 18.3.1 installed.
- Bilingual i18n skeleton created (`en.json` & `hi.json` with 100% key parity).
- `npm run seed:verify` passed: 10/10 story rules verified (5 red, 5 amber, 14 green; QA-8 SPOF & top risk; WLD-6 shift B/C red; exactly 6 trainers; Ravi removal turning 2 cells red; 5 expiring certs at 3,9,14,22,28 days; 1 overdue at -5 days; 45 assignments with top 3 >= 2x median; groupBy total matches pivot totals).
- M3 API foundation complete (`be319aa`): health, meta, operators CRUD, skills CRUD, dev auth.
- M4 Skill Grid & History complete (`0420a60`): 2-D matrix, inline editing, history panel.
- M5 Heatmap, Expiry Job, Alerts complete:
  - `GET /api/coverage`: coverage heatmap payload with pure domain `buildCoverage` and offline fallback.
  - `GET /api/alerts`: open alerts with dynamic `daysRemaining` recalculation and stale catch-up.
  - `POST /api/jobs/expiry-check`: runs expiry job, dual auth (`canEditSkillGrid` or `x-internal-secret`), rate-limited, audit logged, 201 Created.
  - `GET /api/jobs/runs`: paginated execution history.
  - Dashboard UI (`/`): dynamic `KpiCards`, `CoverageHeatmap` with pulsing red glow (`.cell-glow-red`) and forecast slider (MVP-2), `AlertPanel` with Admin "Run check now", and `TopRisksCard`.
- `vitest run` passed: 59/59 tests green across 11 test files.
- `tsc --noEmit` passed: 0 type errors.
- `next lint` passed: 0 ESLint warnings or errors.

## Known issues / decisions / assumptions
- Mode B chosen because `@quikit/*` shared packages are not provided externally; thin local shims are implemented.
- Windows environment: command execution via `cmd /c` to bypass PowerShell script execution policy.
- Local PostgreSQL service on 5432 is down; API route handlers feature graceful fallback to in-memory datasets if DB connection fails in dev, while Prisma queries are strictly scoped by `orgId` from the authenticated session.

## How to resume
```bash
git checkout feature/skillsforge-recovery
npm install
npm run dev
```
