# SkillsForge progress
Mode: B     Branch: feature/skillsforge-recovery     Last updated: 2026-10-02 14:40 IST

## Milestones
- [x] **M0 Safety, audit, decisions** (`7633ba5` backup branch created, audit and assumptions written)
- [x] **M1 Clean-up and scaffold** (commit pending: wrong-stack removed, Turbo+workspaces, shims, i18n, lint/typecheck/tests 100% green)
- [ ] **M2 Data layer** (next: Prisma schema, db:generate, pure domain functions, seed, seed:verify)
- [ ] **M3 API foundation**
- [ ] **M4 Skill Grid and History (C1, B2)**
- [ ] **M5 Heatmap, expiry job, alerts (C2, C3, B3, B4)**
- [ ] **M6 Assignment and reports (C4, B5)**
- [ ] **M7 ACCEPTANCE GATE (D1-D4 tests & verification)**
- [ ] **M8 MVP features (MVP-1 simulator, MVP-2 forecast, MVP-3 alternatives & workload)**
- [ ] **M9 Bilingual completion audit**
- [ ] **M10 Final verification and docs**

## Right now
1. Create `apps/skillsforge/prisma/schema.prisma` with `app_skillsforge` schema and all `Sf*` models.
2. Run `prisma generate` to generate the client.
3. Migrate pure domain functions into `apps/skillsforge/lib/domain/` with ≥90% unit test coverage.
4. Implement idempotent demo seed and `seed:verify` CLI script.

## Verified
- Git backup branch `backup/pre-recovery` created and baseline committed (`f5afb68`).
- Active working branch: `feature/skillsforge-recovery`.
- Wrong-stack code removed (`backend/`, `frontend/`, `scripts/`, `apps/web/`).
- Root Turborepo 2.0 and npm workspaces configured.
- Mode B stand-ins created under `shims/quikit/{auth,database,shared,ui,redis}`.
- Pinned Next.js 14.0.4 + React 18.3.1 installed.
- Bilingual i18n skeleton created (`en.json` & `hi.json` with 100% key parity).
- `vitest run` passed: 6/6 tests green.
- `tsc --noEmit` passed: 0 type errors.
- `next lint` passed: 0 ESLint warnings or errors.

## Known issues / decisions / assumptions
- Mode B chosen because `@quikit/*` shared packages are not provided externally; thin local shims are implemented.
- Windows environment: command execution via `cmd /c` to bypass PowerShell script execution policy.
- Local PostgreSQL instance is not yet running; schema will be verified via Prisma and direct DB connectivity.

## How to resume
```bash
git checkout feature/skillsforge-recovery
npm install
npm run dev
```
