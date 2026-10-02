# Schema Change Request: SkillsForge (`app_skillsforge`)

**Target Database:** PostgreSQL 14+  
**Target Schema:** `app_skillsforge` (via Prisma `multiSchema`)  
**Requested By:** SkillsForge Lead Engineer  
**Status:** Pre-authorised for hackathon integration  

---

## 1. Summary of Changes
Introducing models for **PS 22 SkillsForge** under schema `app_skillsforge` prefixed with `Sf`.

| Model | Schema | Purpose |
|---|---|---|
| `SfShift` | `app_skillsforge` | Shift timing definitions (A, B, C). |
| `SfOperator` | `app_skillsforge` | Operator records with active status and assigned shift. |
| `SfSkill` | `app_skillsforge` | Machine / skill definitions with criticality and Hindi translation. |
| `SfOperatorSkill` | `app_skillsforge` | Matrix cell mapping operator to machine proficiency (levels 0-4) and cert dates. |
| `SfSkillHistory` | `app_skillsforge` | Append-only audit of matrix cell changes with before/after values and actor. |
| `SfAlert` | `app_skillsforge` | Certification expiry and overdue alerts table. |
| `SfJobRun` | `app_skillsforge` | Execution logs of daily expiry checking jobs. |
| `SfAssignment` | `app_skillsforge` | Operator assignment verdicts (accepted/rejected). |

---

## 2. Table Details & Indexes

### `SfShift`
- `id String @id @default(cuid())`
- `orgId String`
- `code String` (A, B, C)
- `startTime String`, `endTime String`
- **Unique:** `@@unique([orgId, code])`
- **Index:** `@@index([orgId])`

### `SfOperator`
- `id String @id @default(cuid())`
- `orgId String`
- `employeeCode String`
- `name String`
- `shiftId String -> SfShift.id`
- `isActive Boolean @default(true)`
- `leftOn DateTime? @db.Date`
- **Unique:** `@@unique([orgId, employeeCode])`
- **Index:** `@@index([orgId])`, `@@index([orgId, shiftId])`, `@@index([orgId, isActive])`

### `SfSkill`
- `id String @id @default(cuid())`
- `orgId String`
- `code String`
- `name String`, `nameHi String?`
- `lineKey String` (MACHINING / FORMING / JOINING / FINISHING)
- `criticality Int @default(2)`
- `isActive Boolean @default(true)`
- **Unique:** `@@unique([orgId, code])`
- **Index:** `@@index([orgId])`, `@@index([orgId, lineKey])`

### `SfOperatorSkill`
- `id String @id @default(cuid())`
- `orgId String`
- `operatorId String -> SfOperator.id (onDelete: Cascade)`
- `skillId String -> SfSkill.id (onDelete: Cascade)`
- `level Int` (0-4)
- `issuedOn DateTime? @db.Date`
- `certifiedUntil DateTime? @db.Date`
- **Unique:** `@@unique([orgId, operatorId, skillId])`
- **Index:** `@@index([orgId, skillId])`, `@@index([orgId, certifiedUntil])`

### `SfSkillHistory` (Append-only)
- `id String @id @default(cuid())`
- `orgId String`
- `operatorId String`, `skillId String`
- `action String` (CREATE / UPDATE / DELETE / SEED)
- `oldLevel Int?`, `newLevel Int?`
- `oldIssuedOn DateTime?`, `newIssuedOn DateTime?`
- `oldCertifiedUntil DateTime?`, `newCertifiedUntil DateTime?`
- `changedBy String` (User ID), `changedByName String?`
- `changedAt DateTime @default(now())`
- `reason String? @db.Text`
- **Index:** `@@index([orgId, operatorId, skillId, changedAt])`, `@@index([orgId, changedAt])`

### `SfAlert`
- `id String @id @default(cuid())`
- `orgId String`
- `operatorId String`, `skillId String`
- `certifiedUntil DateTime @db.Date`
- `severity String` (expired / critical / warning / notice)
- `daysRemaining Int`
- `status String @default("open")` (open / resolved)
- `firstFlaggedAt DateTime @default(now())`
- `lastCheckedAt DateTime`
- `resolvedAt DateTime?`
- `resolvedReason String?`
- **Unique:** `@@unique([orgId, operatorId, skillId, certifiedUntil])`
- **Index:** `@@index([orgId, status, severity])`

### `SfJobRun`
- `id String @id @default(cuid())`
- `orgId String`
- `jobName String`, `triggeredBy String`, `asOfDate DateTime @db.Date`
- `startedAt DateTime @default(now())`, `finishedAt DateTime?`
- `status String`, `flaggedTotal Int`, `newlyFlagged Int`, `resolvedCount Int`
- `errorMessage String?`
- **Index:** `@@index([orgId, jobName, startedAt])`

### `SfAssignment`
- `id String @id @default(cuid())`
- `orgId String`
- `operatorId String`, `skillId String`, `shiftId String`
- `assignmentDate DateTime @db.Date`
- `status String` (accepted / rejected), `verdict String` (green / red)
- `reasonsJson Json?`, `assignedBy String`
- **Index:** `@@index([orgId, operatorId, assignmentDate])`, `@@index([orgId, skillId, assignmentDate])`
