# SkillsForge progress
Mode: B     Branch: feature/skillsforge-recovery     Last updated: 2026-10-02 14:40 IST

## Milestones
- [x] **M0 Safety, audit, decisions** (`f5afb68` backup branch created, audit and assumptions written)
- [ ] **M1 Clean-up and scaffold** (in progress)
- [ ] **M2 Data layer**
- [ ] **M3 API foundation**
- [ ] **M4 Skill Grid and History (C1, B2)**
- [ ] **M5 Heatmap, expiry job, alerts (C2, C3, B3, B4)**
- [ ] **M6 Assignment and reports (C4, B5)**
- [ ] **M7 ACCEPTANCE GATE (D1-D4 tests & verification)**
- [ ] **M8 MVP features (MVP-1 simulator, MVP-2 forecast, MVP-3 alternatives & workload)**
- [ ] **M9 Bilingual completion audit**
- [ ] **M10 Final verification and docs**

## Right now
1. Removing wrong-stack folders (`backend/`, `frontend/`, `scripts/`, `apps/web/`).
2. Scaffolding root workspaces, Turborepo config, and `apps/skillsforge` with pinned Next.js 14.0.4 + React 18.3.1.
3. Implementing Mode B `@quikit/*` shims and base app skeleton with working language switcher.

## Verified
- Git backup branch `backup/pre-recovery` created and baseline committed (`f5afb68`).
- Active working branch switched to `feature/skillsforge-recovery`.
- Node.js version verified: `v26.10.0`, npm version: `11.19.1`.
- Phase 0 Audit completed and recorded in `docs/RECOVERY_AUDIT.md`.
- Architecture decisions logged in `docs/ASSUMPTIONS.md`.

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
