import fs from "fs";
import path from "path";

// Auto-load .env in CLI scripts if not already loaded
try {
  const envPath = path.resolve(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch {}

import { db } from "../db";
import { today, parseDate, addDaysToStr } from "../domain/rules";
import { daysToExpiry, severityFor } from "../domain/qualification";
import {
  DEMO_ORG,
  DEMO_USERS,
  DEMO_SHIFTS,
  DEMO_MACHINES,
  DEMO_OPERATORS,
  getDemoSkillRecords,
  getDemoAssignments,
} from "./seedData";

export async function seedDemoData(baseDate = today()) {
  console.log(`Starting SkillsForge demo seed (asOf: ${baseDate})...`);

  try {
    // Check DB connectivity
    await db.$queryRaw`SELECT 1`;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("⚠️  Database is not reachable. Skipping live DB write.");
    console.warn(`   Reason: ${msg}`);
    console.log("ℹ️  Note: Pure domain seedData and seed:verify are 100% functional offline.");
    return { ok: false, error: msg };
  }

  const orgId = DEMO_ORG.id;
  const asOfDate = parseDate(baseDate)!;

  console.log(`1. Seeding Org: ${DEMO_ORG.name} (${orgId})...`);
  await db.org.upsert({
    where: { id: orgId },
    create: { id: orgId, slug: DEMO_ORG.slug, name: DEMO_ORG.name },
    update: { slug: DEMO_ORG.slug, name: DEMO_ORG.name },
  });

  console.log("2. Seeding Users and OrgMembers...");
  for (const u of DEMO_USERS) {
    await db.user.upsert({
      where: { id: u.id },
      create: { id: u.id, email: u.email, name: u.name },
      update: { email: u.email, name: u.name },
    });

    await db.orgMember.upsert({
      where: { orgId_userId: { orgId, userId: u.id } },
      create: { orgId, userId: u.id, role: u.role },
      update: { role: u.role },
    });

    await db.userAppAccess.upsert({
      where: { orgId_userId_appId: { orgId, userId: u.id, appId: "skillsforge" } },
      create: { orgId, userId: u.id, appId: "skillsforge" },
      update: {},
    });
  }

  console.log("3. Seeding Shifts (A, B, C)...");
  for (const s of DEMO_SHIFTS) {
    await db.sfShift.upsert({
      where: { orgId_code: { orgId, code: s.code } },
      create: { id: s.id, orgId, code: s.code, startTime: s.startTime, endTime: s.endTime },
      update: { startTime: s.startTime, endTime: s.endTime },
    });
  }

  console.log("4. Seeding Machines / Skills (8 machines)...");
  for (const m of DEMO_MACHINES) {
    await db.sfSkill.upsert({
      where: { orgId_code: { orgId, code: m.code } },
      create: {
        id: m.id,
        orgId,
        code: m.code,
        name: m.name,
        nameHi: m.nameHi,
        lineKey: m.lineKey,
        criticality: m.criticality,
        isActive: m.isActive,
      },
      update: {
        name: m.name,
        nameHi: m.nameHi,
        lineKey: m.lineKey,
        criticality: m.criticality,
        isActive: m.isActive,
      },
    });
  }

  console.log("5. Seeding Operators (15 operators)...");
  for (const op of DEMO_OPERATORS) {
    await db.sfOperator.upsert({
      where: { orgId_employeeCode: { orgId, employeeCode: op.employeeCode } },
      create: {
        id: op.id,
        orgId,
        employeeCode: op.employeeCode,
        name: op.name,
        shiftId: op.shiftId,
        isActive: op.isActive,
      },
      update: {
        name: op.name,
        shiftId: op.shiftId,
        isActive: op.isActive,
      },
    });
  }

  console.log("6. Seeding Operator Skills matrix...");
  const skillRecords = getDemoSkillRecords(baseDate);
  for (const r of skillRecords) {
    const issuedOnDate = r.issuedOn ? parseDate(r.issuedOn) : null;
    const certifiedUntilDate = r.certifiedUntil ? parseDate(r.certifiedUntil) : null;

    await db.sfOperatorSkill.upsert({
      where: {
        orgId_operatorId_skillId: {
          orgId,
          operatorId: r.operatorId,
          skillId: r.skillId,
        },
      },
      create: {
        orgId,
        operatorId: r.operatorId,
        skillId: r.skillId,
        level: r.level,
        issuedOn: issuedOnDate,
        certifiedUntil: certifiedUntilDate,
      },
      update: {
        level: r.level,
        issuedOn: issuedOnDate,
        certifiedUntil: certifiedUntilDate,
      },
    });
  }

  console.log("7. Seeding initial Skill History (SEED records)...");
  // Seed sample history records for auditability
  const sampleHistories = [
    {
      operatorId: "op-001",
      skillId: "sk-cnc-l1",
      newLevel: 4,
      reason: "Initial qualification and certification as master trainer",
    },
    {
      operatorId: "op-002",
      skillId: "sk-cnc-l1",
      newLevel: 2,
      reason: "Certified for independent operation",
    },
    {
      operatorId: "op-001",
      skillId: "sk-qa-8",
      newLevel: 4,
      reason: "CMM Inspection certified trainer",
    },
    {
      operatorId: "op-003",
      skillId: "sk-pkg-7",
      newLevel: 3,
      reason: "Packaging Line operator certification",
    },
  ];

  for (const h of sampleHistories) {
    await db.sfSkillHistory.create({
      data: {
        orgId,
        operatorId: h.operatorId,
        skillId: h.skillId,
        action: "SEED",
        newLevel: h.newLevel,
        changedBy: "usr-asha-1",
        changedByName: "Asha Verma",
        reason: h.reason,
      },
    });
  }

  console.log("8. Seeding Alerts (5 expiring + 1 overdue)...");
  let flaggedTotal = 0;
  for (const r of skillRecords) {
    if (!r.certifiedUntil) continue;
    const days = daysToExpiry(r.certifiedUntil, baseDate);
    if (days !== null && days <= 30) {
      const severity = severityFor(days);
      const certDate = parseDate(r.certifiedUntil)!;

      await db.sfAlert.upsert({
        where: {
          orgId_operatorId_skillId_certifiedUntil: {
            orgId,
            operatorId: r.operatorId,
            skillId: r.skillId,
            certifiedUntil: certDate,
          },
        },
        create: {
          orgId,
          operatorId: r.operatorId,
          skillId: r.skillId,
          certifiedUntil: certDate,
          severity,
          daysRemaining: days,
          status: "open",
          firstFlaggedAt: new Date(),
          lastCheckedAt: new Date(),
        },
        update: {
          severity,
          daysRemaining: days,
          lastCheckedAt: new Date(),
        },
      });
      flaggedTotal++;
    }
  }

  console.log("9. Recording initial successful JobRun...");
  await db.sfJobRun.create({
    data: {
      orgId,
      jobName: "expiry_check",
      triggeredBy: "manual",
      asOfDate,
      startedAt: new Date(),
      finishedAt: new Date(),
      status: "ok",
      flaggedTotal,
      newlyFlagged: flaggedTotal,
      resolvedCount: 0,
    },
  });

  console.log("10. Seeding Assignments (45 assignments)...");
  const assignments = getDemoAssignments(baseDate);
  for (const a of assignments) {
    await db.sfAssignment.create({
      data: {
        orgId,
        operatorId: a.operatorId,
        skillId: a.skillId,
        shiftId: a.shiftId,
        assignmentDate: parseDate(a.assignmentDate)!,
        status: a.status,
        verdict: a.verdict,
        assignedBy: "usr-rohit-2",
      },
    });
  }

  console.log("✅ Demo seed completed successfully!");
  return { ok: true };
}

// CLI runner
if (require.main === module || process.argv[1]?.endsWith("seed.ts")) {
  seedDemoData()
    .then((res) => {
      if (res.ok) {
        process.exit(0);
      } else {
        process.exit(0); // Exit 0 with warning if DB was unreachable in dev
      }
    })
    .catch((err) => {
      console.error("Fatal seed error:", err);
      process.exit(1);
    });
}
