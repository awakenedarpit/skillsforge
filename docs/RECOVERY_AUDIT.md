# SkillsForge: Recovery Audit & Assessment

**Date:** 2026-10-02  
**Branch:** `feature/skillsforge-recovery` (safety baseline preserved on `backup/pre-recovery`)  
**Auditor:** Lead Engineer (Antigravity IDE / Gemini)  
**Status:** Audit Complete — Decided Mode B

---

## 1. Inventory

### Git State
- **Current Branch:** `feature/skillsforge-recovery`
- **Safety Baseline Branch:** `backup/pre-recovery` (commit `f5afb68`)
- **Initial Commit:** `555eac9 initital commit`
- **Working Tree:** Clean baseline committed.

### Directory Structure & Module Analysis
The repository arrived in an inconsistent, multi-IDE state:
- `backend/`: Python FastAPI service (`app/main.py`, `app/core`, `app/domain`, `requirements.txt`, `pytest.ini`). Uses SQLite/SQLAlchemy.
- `frontend/`: Standalone Vite + React SPA (`package.json`, `vite.config.ts`, Tailwind, mock in-memory state). Broken TypeScript syntax in translations.
- `apps/web/`: Incomplete Next.js 14.2 App Router attempt containing unapproved libraries (`zustand`, `react-hook-form`, `d3`, `shadcn`, `@base-ui/react`, `zod@4.6.5`). Wrong naming (`apps/web` vs `apps/skillsforge`).
- `packages/database/`: Partial Prisma schema missing `multiSchema`, `app_skillsforge` schema mapping, `Sf` model prefixes, cuid IDs.
- `packages/shared/`: Clean pure TypeScript domain implementations of coverage pivot, risk calculation, qualification checking, assignment verdict, and alert reconciliation.
- `scripts/`: `scripts/py.js` runner for Python backend.
- Root files: `package.json` (running concurrently for Python + Vite), `package-lock.json`, `.env.example` (FastAPI/SQLite configuration).

### Lockfiles & Package Managers
- `package-lock.json` in root and `frontend/package-lock.json`.
- Multiple IDE touches detected. We will retain **only root `package-lock.json`** and adopt npm workspaces with Turborepo 2.0.

---

## 2. Health Checks

| Component | Command | Result | Notes |
|---|---|---|---|
| Root | `npm run test` | FAILED | Powershell execution policy blocked `npm.ps1`; when invoked via cmd, stalled on Vitest in `frontend/` due to syntax errors in `translations.ts`. |
| Backend | `pytest` | PASSED (3 tests) | Only tests health endpoints on skeleton FastAPI. Wrong stack. |
| Apps/Web | `npm run build` | UNBUILT / WRONG DEPS | Unapproved libraries (`zustand`, `react-hook-form`, `d3`, `zod@4`). |
| Frontend | `npm run dev` | FAILED | ESBuild error in `translations.ts:68` (`Expected "}" but found "My"`). |

---

## 3. Module Classification

| Module / Path | Classification | Rationale |
|---|---|---|
| `backend/` | **DELETE** | Python / FastAPI / SQLite is wrong stack. Pure domain concepts already ported to TS. |
| `frontend/` | **DELETE** | Vite / React SPA mock frontend is wrong stack. Translation tokens and UI concepts salvaged. |
| `apps/web/` | **REPLACE** | Next.js 14.2 app with unapproved dependencies. Replace with clean `apps/skillsforge` adhering to QuikIT conventions. |
| `packages/database/` | **REFACTOR** | Prisma schema lacks `multiSchema`, `app_skillsforge` schema, `Sf*` models. Refactor into standard platform schema. |
| `packages/shared/` | **KEEP & MIGRATE** | Excellent pure TypeScript domain implementations. Port to `apps/skillsforge/lib/domain/` with 90%+ unit test coverage. |
| `scripts/` | **DELETE** | `py.js` Python launcher no longer needed. |
| Root configs | **REFACTOR** | Convert root to Turborepo + npm workspaces (`apps/*`, `packages/*`). |

---

## 4. Requirements & Acceptance Matrix

| Requirement | Description | Status | File Path / Location |
|---|---|---|---|
| **C1** | Operator × Machine Skill Grid (levels 0-4, inline edit, history) | PARTIAL (Wrong stack) | To implement in `apps/skillsforge/app/(dashboard)/grid/` & `/api/grid` |
| **C2** | Certification records + expiry alerts (30-day window, live panel) | PARTIAL | Domain logic in `alertsLogic.ts`; needs `SfAlert` DB + job + UI |
| **C3** | Coverage Heatmap (counts, <2 glowing red, shift breakdown) | PARTIAL | Domain logic in `coverage.ts`; needs `Sf*` DB + Next.js UI |
| **C4** | Assignment check + gap report (green/red verdict, SPOF report) | PARTIAL | Domain logic in `verdict.ts` & `risk.ts`; needs API + report page |
| **B1** | Schema in PostgreSQL via Prisma (`app_skillsforge`, `Sf*`) | PARTIAL | `packages/database/prisma/schema.prisma` needs `Sf*` overhaul |
| **B2** | CRUD API with audit & `SfSkillHistory` | MISSING | To implement in `apps/skillsforge/app/api/` |
| **B3** | Heatmap pivot (pure domain + API) | DONE (domain) | `packages/shared/src/domain/coverage.ts` |
| **B4** | Expiry job (scheduled/manual, `SfJobRun`) | PARTIAL | Logic in domain; needs runner & route |
| **B5** | Printable gap report & verdict | MISSING | To implement in `/reports/gaps` & `/reports/verdict` |
| **D1** | Live edit updates heatmap instantly without reload | MISSING | TanStack Query cache invalidation to wire up |
| **D2** | Expiring cert on alert panel with days remaining | MISSING | To wire up in live alert panel component |
| **D3** | Unqualified assignment rejected with reasons shown | MISSING | To wire up in `/assign` page |
| **D4** | Gap report names riskiest machines | MISSING | DB aggregation + risk score ordering |
| **MVP-1** | "What if X resigns?" simulator | PARTIAL | Domain logic in `simulateRemoval`; needs `/simulator` UI |
| **MVP-2** | Coverage forecast slider (0 to +90 days) | PARTIAL | Domain logic in `forecast`; needs slider UI + `turnsRedOn` |
| **MVP-3** | Smart alternatives + workload fairness | PARTIAL | Domain logic in `rankAlternatives`; needs `/workload` chart |
| **Bilingual** | English + Hindi with toggle | PARTIAL | Needs cookie-based i18n + `en.json` / `hi.json` parity |

---

## 5. Decision: Mode A vs Mode B

**Decision: MODE B.**  
**Reason:** The repository does not include real external `@quikit/{auth,ui,redis,shared,database}` packages. `packages/database` and `packages/shared` in the repo were embryonic local attempts. Therefore, following Section 2.4 of the master specification, we will build thin local stand-ins under `apps/skillsforge/shims/quikit/{auth,database,shared,ui,redis}/` and map `@quikit/*` via `tsconfig.json` `paths` and `vitest.config.ts`. Every shim will be marked `// LOCAL STAND-IN for @quikit/<pkg>: delete at integration`.

---

## 6. Execution Plan

1. **M1: Clean-up and Scaffold**
   - Remove wrong-stack folders (`backend/`, `frontend/`, `scripts/`, `apps/web/`).
   - Create root `package.json` with Turborepo 2.0 and npm workspaces.
   - Scaffold `apps/skillsforge` with Next.js 14.0.4, React 18.3.1 (pinned), Tailwind CSS 3, Radix primitives, Lucide icons.
   - Implement Mode B shims (`@quikit/{auth,database,shared,ui,redis}`).
   - Setup `docker-compose.yml`, `CLAUDE.md`, `apps/skillsforge/CLAUDE.md`, `AGENTS.md`.
   - Setup i18n skeleton (`en.json`, `hi.json`, `useT`, `getT`, `LanguageSwitcher`).
   - Verify `typecheck`, `lint`, and app boot on port 3011.

2. **M2: Data Layer & Domain**
   - Overhaul Prisma schema with `app_skillsforge` schema and all `Sf*` models.
   - Migrate pure domain functions to `apps/skillsforge/lib/domain/` with ≥90% unit test coverage.
   - Implement idempotent demo seed (15 operators × 8 machines, 5 expiring certs + 1 overdue).
   - Implement `seed:verify` CLI script with all 10 domain assertion rules.

3. **M3: API Foundation**
   - Implement `withOrgAuth`, `requireAdmin`, `validationError`, `writeAuditLog`, `canEditSkillGrid`.
   - Health and Meta endpoints (`GET /api/health`, `GET /api/meta`).
   - Operators and Skills CRUD route handlers.
   - Mode B dev credentials login.

4. **M4: Skill Grid & History (C1, B2)**
   - API: `/api/grid`, `PATCH /api/operator-skills`, `DELETE /api/operator-skills`, `/api/history`.
   - UI: 2-D matrix with inline Popover edit, level keys (0-4), history slide panel.

5. **M5: Heatmap, Alerts, Expiry Job (C2, C3, B3, B4)**
   - API: `/api/coverage`, `/api/alerts`, `POST /api/jobs/expiry-check`, `/api/jobs/runs`.
   - UI: Glowing red cells, count badges, cell drill-down panel, live alert panel.

6. **M6: Assignment Check & Gap Report (C4, B5)**
   - API: `/api/assignments/check`, `/api/assignments`, `/api/reports/gaps`, `/api/reports/verdict`.
   - UI: Assignment check page, printable reports, client CSV export.

7. **M7: Acceptance Gate (D1-D4)**
   - `api/acceptance.test.ts` covering D1, D2, D3, D4.
   - Verification in browser.

8. **M8: 3 MVP Features**
   - MVP-1: Resignation simulator (`/simulator`).
   - MVP-2: Forecast slider on Heatmap (`0` to `+90` days).
   - MVP-3: Smart alternatives & workload fairness (`/workload`).

9. **M9: Bilingual Audit & Polish**
   - Full English and Hindi dictionary parity.
   - Offline typography (`@fontsource-variable/inter` and `@fontsource/noto-sans-devanagari`).

10. **M10: Final Verification & Hand-off**
    - Verification of all quality gates (`lint`, `typecheck`, `test`, `build`, `seed:verify`).
    - Comprehensive README and `PROGRESS.md`.
