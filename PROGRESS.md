# SkillsForge progress
Mode: B     Branch: feature/skillsforge-recovery     Last updated: 2026-10-02 15:43 IST

## Milestones
- [x] **M0 Safety, audit, decisions** (`7633ba5` backup branch created, audit and assumptions written)
- [x] **M1 Clean-up and scaffold** (`fbaae35` wrong-stack removed, Turbo 2.0+workspaces, Mode B shims, i18n skeleton, lint/typecheck/tests 100% green)
- [x] **M2 Data layer** (`804637e` Prisma schema with multiSchema `app_skillsforge`, pure domain functions, 100% domain tests, seed & seed:verify with 10/10 story checks green)
- [x] **M3 API foundation** (`be319aa` withOrgAuth, requireAdmin, validationError, auditLog, permissions, health, meta, operators CRUD, skills CRUD, dev login & /login page, 41/41 tests green)
- [x] **M4 Skill Grid and History (C1, B2)** (`0420a60` GET /api/grid, PATCH/DELETE /api/operator-skills, GET /api/history, /grid UI with 2-D matrix, inline Popover level edit 0-4, keyboard shortcuts, history SlidePanel, 49/49 tests green)
- [x] **M5 Heatmap, expiry job, alerts (C2, C3, B3, B4)** (`90e0ac9` GET /api/coverage, GET /api/alerts, POST /api/jobs/expiry-check, GET /api/jobs/runs, dashboard Coverage Heatmap with pulsing red glow, live Alert Panel with days remaining, Admin "Run check now", 59/59 tests green)
- [x] **M6 Assignment and reports (C4, B5)** (`HEAD` GET /api/assignments/check, POST/GET /api/assignments, GET /api/workload, GET /api/reports/gaps, GET /api/reports/verdict, /assign, /reports, /reports/gaps, /reports/verdict, 71/71 tests green)
- [x] **M7 ACCEPTANCE GATE (D1-D4 tests & verification)** (`HEAD` `__tests__/api/acceptance.test.ts` asserting D1-D4, 75/75 tests green, 0 type errors, 0 lint errors)
- [x] **M8 MVP features (MVP-1 simulator, MVP-2 forecast, MVP-3 alternatives & workload)** (`HEAD` GET /api/simulate/resignation, /simulator page with side-by-side heatmaps and impact cards, forecast slider with turnsRedOn days, smart alternatives in /assign, /workload page with Recharts bar chart, median reference line and concentration summary, 78/78 tests green)
- [x] **M9 Bilingual completion audit** (`HEAD` 100% key parity across en.json & hi.json, zero missing keys, self-hosted Inter & Noto Sans Devanagari font stacks, cookie-persisted language switch on dashboard header and login page, 79/79 tests green)
- [ ] **M10 Final verification and docs**

## Right now
1. Execute M10 Final Verification and Documentation:
   - Run production bundle build (`npm run build`).
   - Run full test suite (`npm test`).
   - Run linter (`npm run lint`) and typecheck (`npm run typecheck`).
   - Write comprehensive `README.md` (overview, stack, exact ports, requirements traceability table, plain SQL equivalent of gap report query, 3-minute demo script).
   - Write `docs/DEPENDENCIES.md` with justifications.
   - Write `docs/SCHEMA_CHANGE_REQUEST.md`.
   - Update final `PROGRESS.md`.
2. Commit M10.

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
- M5 Heatmap, Expiry Job, Alerts complete (`90e0ac9`): live heatmap with glow, expiry worker, live alert panel, KPI cards.
- M6 Assignment and Reports complete:
  - `GET /api/assignments/check`: live qualification verdict (green/red), blocking reasons, warnings, top 3 alternatives.
  - `POST /api/assignments`: 201 Created on approval; 409 Conflict on rejection storing rejected row and returning reason.
  - `GET /api/assignments`: paginated assignment log.
  - `GET /api/workload`: 14-day workload distribution with median and overload flags.
  - `GET /api/reports/gaps`: SPOFs via DB groupBy (<2 qualified), high-risk shift cells, and explainable multi-factor risk scores.
  - `GET /api/reports/verdict`: printable qualification certificate payload.
  - `/assign` page: live check, verdict card, blocking reasons, smart alternatives (MVP-3), deploy action.
  - `/reports`, `/reports/gaps`, `/reports/verdict` pages: printable reports with client-side CSV export.
- `vitest run` passed: 71/71 tests green across 13 test files.
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
