# SkillsForge: Operator Skill Matrix & Certification Tracker

> **CODESPRINT Hackathon · Problem Statement PS 22**  
> Built strictly adhering to the **QuikIT Monorepo & Platform Conventions (Mode B)**.

---

## 1. Overview & Problem Solved

On modern manufacturing shop floors, *"who can operate which machine"* often lives in supervisors' heads or scattered spreadsheets. Critical problems emerge:
1. **Unnoticed Expiries:** Qualifications and safety certifications expire without warning, risking regulatory shutdowns.
2. **Single Points of Failure (SPOF):** Machine cells are left with zero backup operators when resignations occur or during off-shifts.
3. **Fatigue & Unfair Scheduling:** Schedulers repeatedly deploy the same qualified individuals, burning them out while others sit underutilized.

**SkillsForge** provides a real-time, bilingual (English & Hindi) control-room solution:
- **Skill Grid (0 to 4 levels)** with inline editing and change history audits.
- **Automated Expiry Checks & Live Alert Panel** with exact days remaining.
- **Coverage Heatmap** pivoting qualified operators per machine/shift, with single points of failure (< 2 qualified) pulsing red.
- **Assignment Qualification Checker** with green/red verdicts, blocking rules, warnings, and smart alternatives.
- **3 Purpose-Built MVP Features:**
  1. **MVP-1 ("What if X leaves?"):** Interactive Resignation Simulator (`/simulator`).
  2. **MVP-2 (Coverage Forecast):** +0 to +90 days forecast slider with expiry lookahead.
  3. **MVP-3 (Workload Fairness & Alternatives):** 14-day deployment distribution chart (`/workload`) and smart ranking of alternatives on assignment rejection.

---

## 2. Platform Architecture & Stack

SkillsForge is implemented in accordance with QuikIT Monorepo standards:

| Layer | Implementation | Notes |
|---|---|---|
| **Framework** | **Next.js 14.0.4** (App Router) | Server components, client components, and Route Handlers. |
| **Language** | **TypeScript 5.3** (Strict) | Zero `any` escapes in core domain. |
| **Database** | **PostgreSQL 14+ via Prisma 5.7** | Schema `app_skillsforge` using Prisma `multiSchema`. |
| **Auth** | **NextAuth 4.24** (JWT) | Pre-seeded personas: Plant Head (Org Admin), Supervisor (App Admin), Auditor (Member). |
| **Monorepo** | **Turborepo 2.0 + npm workspaces** | `apps/skillsforge` + `packages/*` (`packageManager: npm@11.19.1`). |
| **Shims (Mode B)** | Local stand-ins under `shims/quikit/` | Strict isolation: `auth`, `database`, `shared`, `ui`, `redis`. |
| **Validation** | **Zod 3.22** | Unified schemas between client and API route handlers. |
| **Client State** | **TanStack React Query v5** | Instant cache invalidation without page reloads (D1). |
| **Visualizations** | **Recharts 2.10** | Workload distribution bar chart and median reference line. |
| **Icons** | **Lucide React** | Platform-approved icons only; no raw emojis. |
| **Bilingual** | **Custom zero-dependency i18n** | 100% key parity across `en.json` & `hi.json`, cookie persistence (`sf_locale`). |
| **Typography** | Self-hosted Inter & Noto Sans Devanagari | Zero external CDN scripts or fonts. 100% offline-ready. |

---

## 3. Quick Start & Execution

### Prerequisites
- Node.js 20+ (LTS)
- npm 10+ or 11+
- (Optional) PostgreSQL 14+ on port 5432 (system includes seamless in-memory seed fallback if DB is offline)

### Commands

```bash
# 1. Install dependencies from root
npm install

# 2. Run developer test suite (15 suites, 79 tests)
npm test

# 3. Verify seed dataset story rules (10/10 story checks)
npm run seed:verify

# 4. Start local development server on port 3011 (mandatory port)
npm run dev

# 5. Production build and start on port 3011
npm run build
npm run start
```

App is accessible at: **`http://localhost:3011`**

---

## 4. Requirement Traceability Matrix

| ID | Specification Requirement | Source Files | Test Files | Status |
|---|---|---|---|:---:|
| **C1** | **Skill Grid (0-4):** Inline edit, history log, who changed what, when. | `app/(dashboard)/grid/page.tsx`<br>`app/api/grid/route.ts`<br>`app/api/operator-skills/route.ts` | `grid.test.ts`<br>`operator-skills.test.ts`<br>`acceptance.test.ts` (D1) | ✅ Pass |
| **C2** | **Certification Expiry Alerts:** 30-day window, daily job, live alert panel with days remaining. | `lib/api/expiryJob.ts`<br>`app/api/alerts/route.ts`<br>`components/alert-panel.tsx` | `jobs.test.ts`<br>`alerts.test.ts`<br>`acceptance.test.ts` (D2) | ✅ Pass |
| **C3** | **Coverage Heatmap:** Shifts × Machines pivot, <2 qualified glow red, instant update on edit. | `lib/domain/coverage.ts`<br>`app/api/coverage/route.ts`<br>`components/heatmap.tsx` | `coverage.test.ts`<br>`domain.test.ts`<br>`acceptance.test.ts` (D1) | ✅ Pass |
| **C4** | **Assignment Check & Gaps:** Green/red verdict with reasons, no-backup machines report. | `lib/domain/verdict.ts`<br>`app/api/assignments/check/route.ts`<br>`app/api/reports/gaps/route.ts` | `assignments.test.ts`<br>`reports.test.ts`<br>`acceptance.test.ts` (D3, D4) | ✅ Pass |
| **B1** | **Prisma Schema:** Models in schema `app_skillsforge`. | `prisma/schema.prisma` | `setup.ts`<br>`seed:verify` | ✅ Pass |
| **B2** | **Change History CRUD:** Append-only history table `SfSkillHistory`. | `app/api/operator-skills/route.ts`<br>`app/api/history/route.ts` | `operator-skills.test.ts` | ✅ Pass |
| **B3** | **Heatmap Pivot:** Single query fetch + pure domain pivot with risk scores. | `lib/domain/coverage.ts`<br>`lib/domain/risk.ts` | `domain.test.ts` | ✅ Pass |
| **B4** | **Idempotent Expiry Job:** Multi-trigger worker writing to `SfAlert` and `SfJobRun`. | `lib/api/expiryJob.ts`<br>`app/api/jobs/expiry-check/route.ts` | `jobs.test.ts`<br>`acceptance.test.ts` (D2) | ✅ Pass |
| **B5** | **Printable Reports & CSV Export:** Clean print stylesheets and client-side CSV export. | `app/(dashboard)/reports/gaps/page.tsx`<br>`app/(dashboard)/reports/verdict/page.tsx` | `reports.test.ts` | ✅ Pass |
| **D1** | **Demo Gate 1:** Live level edit updates heatmap instantly without page reload. | `components/heatmap.tsx`<br>`app/api/operator-skills/route.ts` | `acceptance.test.ts` (D1) | ✅ Pass |
| **D2** | **Demo Gate 2:** Expiring certs appear on alert panel with exact days remaining. | `components/alert-panel.tsx`<br>`lib/domain/qualification.ts` | `acceptance.test.ts` (D2) | ✅ Pass |
| **D3** | **Demo Gate 3:** Unqualified operator assignment rejected with structured reason messages. | `app/(dashboard)/assign/page.tsx`<br>`app/api/assignments/route.ts` | `acceptance.test.ts` (D3) | ✅ Pass |
| **D4** | **Demo Gate 4:** Gap report names the riskiest machines (QA-8 ranked #1). | `app/(dashboard)/reports/gaps/page.tsx`<br>`lib/domain/risk.ts` | `acceptance.test.ts` (D4) | ✅ Pass |
| **MVP-1** | **Resignation Simulator:** "What if X leaves?" side-by-side heatmaps and impact cards. | `app/api/simulate/resignation/route.ts`<br>`app/(dashboard)/simulator/page.tsx` | `simulator.test.ts`<br>`domain.test.ts` | ✅ Pass |
| **MVP-2** | **Forecast Slider:** +0 to +90 days slider on heatmap with `turnsRedOn` indicators. | `components/heatmap.tsx`<br>`lib/domain/coverage.ts` | `coverage.test.ts` | ✅ Pass |
| **MVP-3** | **Fairness & Alternatives:** 14-day workload chart (`/workload`) and smart alternatives. | `app/(dashboard)/workload/page.tsx`<br>`app/api/workload/route.ts` | `assignments.test.ts` | ✅ Pass |
| **I18N** | **100% Bilingual (EN/HI):** Segmented switcher, dictionary parity, Devanagari fonts. | `lib/i18n/*`<br>`messages/en.json`<br>`messages/hi.json` | `i18n.test.ts` | ✅ Pass |

---

## 5. Plain SQL Equivalent of the Gap Report Query

In `app/api/reports/gaps/route.ts`, single points of failure (SPOFs) are computed via a database-side aggregation of qualified operators per machine, outer-joined with all machines to capture zero-operator lines:

```sql
-- Plain SQL Equivalent of SkillsForge SPOF & Vulnerability Aggregation
WITH active_qualified_counts AS (
  SELECT
    os."skillId",
    COUNT(*)::int AS qualified_count,
    COUNT(CASE WHEN os.level >= 4 THEN 1 END)::int AS trainer_count
  FROM app_skillsforge."SfOperatorSkill" os
  INNER JOIN app_skillsforge."SfOperator" op
    ON os."operatorId" = op.id
  WHERE
    os."orgId" = 'demo-manufacturing'
    AND os.level >= 2
    AND op."isActive" = true
    AND (os."certifiedUntil" IS NULL OR os."certifiedUntil" >= CURRENT_DATE)
  GROUP BY os."skillId"
)
SELECT
  s.id AS "skillId",
  s.code AS "machineCode",
  s.name AS "machineName",
  s."nameHi" AS "machineNameHi",
  s.criticality,
  s."lineKey",
  COALESCE(qc.qualified_count, 0) AS "qualifiedCount",
  COALESCE(qc.trainer_count, 0) AS "trainerCount",
  CASE
    WHEN COALESCE(qc.qualified_count, 0) < 2 THEN true
    ELSE false
  END AS "isSpof"
FROM app_skillsforge."SfSkill" s
LEFT JOIN active_qualified_counts qc
  ON s.id = qc."skillId"
WHERE
  s."orgId" = 'demo-manufacturing'
  AND s."isActive" = true
  AND COALESCE(qc.qualified_count, 0) < 2
ORDER BY
  s.criticality DESC,
  "qualifiedCount" ASC,
  s.code ASC;
```

---

## 6. Three-Minute Demo Walkthrough Script

### Minute 0:00 – Sign-In & Dashboard Overview
1. Open `http://localhost:3011/login`.
2. Notice the top-right **Language Switcher** (`EN` / `हिं`). Click `हिं`—observe all titles, persona badges, and role descriptions instantly switch to natural shop-floor Hindi.
3. Click **"Shop Supervisor (App Admin)"** (`Anita Sharma`) to sign in instantly.
4. On `/` Dashboard:
   - Point out the 4 KPI cards: 5 Red Cells, 1 SPOF Machine (QA-8), 5 Expiring in 30 Days, 1 Overdue Cert.
   - Show the **Coverage Heatmap**: notice cells with < 2 qualified operators **pulse with a red glow**.

### Minute 1:00 – Live Edit (D1) & Expiry Alerts (D2)
5. Navigate to **Skill Grid** (`/grid`).
6. Click any cell (e.g. `Ravi Kumar` on `CNC-L1`). Change the proficiency level or expiry date.
7. Click Save. Notice the instant toast notification.
8. Switch back to `/` Dashboard: without any page reload, the cell count and totals reflect the edit (**D1**).
9. Look at the **Alert Panel** on the dashboard:
   - 5 certifications are flagged with exact countdown badges (**3, 9, 14, 22, and 28 days left**).
   - 1 overdue certification is flagged with a red **"overdue by 5 days"** badge (**D2**).
10. Click **"Run check now"** (as Admin) to demonstrate worker idempotency.

### Minute 2:00 – Assignment Check (D3) & Gap Report (D4)
11. Navigate to **Assign** (`/assign`):
    - Select an operator with level 1 (e.g. `OP-004 Meena Iyer` on `CNC-M2`).
    - The check returns a large **RED (UNQUALIFIED)** card explaining: *"Level 1 on CNC Milling; needs at least 2 (can operate)"* (**D3**).
    - Point out **Smart Alternatives (MVP-3)**: the system lists the top 3 qualified replacements on that shift with lowest workload, and provides an **"Assign Instead"** one-click button.
12. Navigate to **Reports → Gap Report** (`/reports/gaps`):
    - The report names **QA-8 (CMM Inspection)** as the #1 operational risk in the factory (**D4**), showing only 1 qualified operator whose certificate expires in 9 days.
    - Click **"Export CSV"** to demonstrate instant client-side CSV download.
    - Click **"Print Report"** to show clean print formatting.

### Minute 2:30 – Resignation Simulator (MVP-1) & Workload Fairness (MVP-3)
13. Navigate to **Simulator** (`/simulator`):
    - Choose `Ravi Kumar`.
    - Observe the instant before-and-after heatmaps side by side: Ravi's departure turns **2 machine cells red** (`CNC-L1` and `CNC-M2` on Shift A).
    - Point out the impact banner: *"If Ravi Kumar leaves, 2 machine-shift cells turn RED."*
14. Navigate to **Workload** (`/workload`):
    - Show the Recharts bar chart of 14-day assignments with the median benchmark line (2 tasks).
    - Highlight the concentration note: *"3 operators hold 60% of all assignments in the last 14 days."*
    - Point out the overloaded badges on the top 3 operators, explaining how SkillsForge directly prevents operator burnout.
15. Toggle the language switcher to `हिं` on any page to show 100% Devanagari translation parity across every table, chart tooltip, and navigation link.
