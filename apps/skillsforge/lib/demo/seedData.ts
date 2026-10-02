import { addDaysToStr, today } from "../domain/rules";

export const DEMO_ORG = {
  id: "org-demo-manufacturing",
  slug: "demo-manufacturing",
  name: "SkillsForge Manufacturing Plant",
};

export const DEMO_USERS = [
  {
    id: "usr-super-0",
    email: "superadmin@skillsforge.quikit.io",
    name: "System SuperAdmin",
    role: "org_admin",
    isSuperAdmin: true,
  },
  {
    id: "usr-asha-1",
    email: "asha.verma@skillsforge.quikit.io",
    name: "Asha Verma",
    role: "org_admin",
  },
  {
    id: "usr-vikas-3",
    email: "vikas.rao@skillsforge.quikit.io",
    name: "Vikas Rao",
    role: "app_admin", // supervisor
  },
  {
    id: "usr-rohit-2",
    email: "rohit.kulkarni@skillsforge.quikit.io",
    name: "Rohit Kulkarni",
    role: "member", // operator / member
    operatorId: "op-001",
  },
];

export const DEMO_SHIFTS = [
  { id: "shift-a", code: "A", startTime: "06:00", endTime: "14:00" },
  { id: "shift-b", code: "B", startTime: "14:00", endTime: "22:00" },
  { id: "shift-c", code: "C", startTime: "22:00", endTime: "06:00" },
];

export const DEMO_MACHINES = [
  { id: "sk-cnc-l1", code: "CNC-L1", name: "CNC Lathe", nameHi: "सीएनसी लेथ", lineKey: "MACHINING", criticality: 3, isActive: true },
  { id: "sk-cnc-m2", code: "CNC-M2", name: "CNC Milling", nameHi: "सीएनसी मिलिंग", lineKey: "MACHINING", criticality: 3, isActive: true },
  { id: "sk-grd-3", code: "GRD-3", name: "Surface Grinder", nameHi: "सरफेस ग्राइंडर", lineKey: "MACHINING", criticality: 2, isActive: true },
  { id: "sk-prs-4", code: "PRS-4", name: "Hydraulic Press", nameHi: "हाइड्रोलिक प्रेस", lineKey: "FORMING", criticality: 2, isActive: true },
  { id: "sk-inj-5", code: "INJ-5", name: "Injection Moulding", nameHi: "इंजेक्शन मोल्डिंग", lineKey: "FORMING", criticality: 3, isActive: true },
  { id: "sk-wld-6", code: "WLD-6", name: "Welding Robot Cell", nameHi: "वेल्डिंग रोबोट सेल", lineKey: "JOINING", criticality: 3, isActive: true },
  { id: "sk-pkg-7", code: "PKG-7", name: "Packaging Line", nameHi: "पैकेजिंग लाइन", lineKey: "FINISHING", criticality: 1, isActive: true },
  { id: "sk-qa-8", code: "QA-8", name: "CMM Inspection", nameHi: "सीएमएम निरीक्षण", lineKey: "FINISHING", criticality: 3, isActive: true },
];

export const DEMO_OPERATORS = [
  // Shift A (5 operators)
  { id: "op-001", employeeCode: "OP-001", name: "Ravi Kumar", shiftId: "shift-a", isActive: true, shift: { id: "shift-a", code: "A", startTime: "06:00", endTime: "14:00" } },
  { id: "op-002", employeeCode: "OP-002", name: "Anita Sharma", shiftId: "shift-a", isActive: true, shift: { id: "shift-a", code: "A", startTime: "06:00", endTime: "14:00" } },
  { id: "op-003", employeeCode: "OP-003", name: "Suresh Patil", shiftId: "shift-a", isActive: true, shift: { id: "shift-a", code: "A", startTime: "06:00", endTime: "14:00" } },
  { id: "op-004", employeeCode: "OP-004", name: "Meena Iyer", shiftId: "shift-a", isActive: true, shift: { id: "shift-a", code: "A", startTime: "06:00", endTime: "14:00" } },
  { id: "op-005", employeeCode: "OP-005", name: "Arjun Singh", shiftId: "shift-a", isActive: true, shift: { id: "shift-a", code: "A", startTime: "06:00", endTime: "14:00" } },

  // Shift B (5 operators)
  { id: "op-006", employeeCode: "OP-006", name: "Farhan Sheikh", shiftId: "shift-b", isActive: true, shift: { id: "shift-b", code: "B", startTime: "14:00", endTime: "22:00" } },
  { id: "op-007", employeeCode: "OP-007", name: "Kavita Nair", shiftId: "shift-b", isActive: true, shift: { id: "shift-b", code: "B", startTime: "14:00", endTime: "22:00" } },
  { id: "op-008", employeeCode: "OP-008", name: "Deepak Verma", shiftId: "shift-b", isActive: true, shift: { id: "shift-b", code: "B", startTime: "14:00", endTime: "22:00" } },
  { id: "op-009", employeeCode: "OP-009", name: "Pooja Desai", shiftId: "shift-b", isActive: true, shift: { id: "shift-b", code: "B", startTime: "14:00", endTime: "22:00" } },
  { id: "op-010", employeeCode: "OP-010", name: "Imran Khan", shiftId: "shift-b", isActive: true, shift: { id: "shift-b", code: "B", startTime: "14:00", endTime: "22:00" } },

  // Shift C (5 operators)
  { id: "op-011", employeeCode: "OP-011", name: "Sunita Rao", shiftId: "shift-c", isActive: true, shift: { id: "shift-c", code: "C", startTime: "22:00", endTime: "06:00" } },
  { id: "op-012", employeeCode: "OP-012", name: "Vikram Chauhan", shiftId: "shift-c", isActive: true, shift: { id: "shift-c", code: "C", startTime: "22:00", endTime: "06:00" } },
  { id: "op-013", employeeCode: "OP-013", name: "Neha Joshi", shiftId: "shift-c", isActive: true, shift: { id: "shift-c", code: "C", startTime: "22:00", endTime: "06:00" } },
  { id: "op-014", employeeCode: "OP-014", name: "Rahul Mehta", shiftId: "shift-c", isActive: true, shift: { id: "shift-c", code: "C", startTime: "22:00", endTime: "06:00" } },
  { id: "op-015", employeeCode: "OP-015", name: "Lakshmi Reddy", shiftId: "shift-c", isActive: true, shift: { id: "shift-c", code: "C", startTime: "22:00", endTime: "06:00" } },
];

const globalForDemo = globalThis as unknown as {
  _demoSkillRecords?: any[];
  _demoHistory?: any[];
  _demoLeaveRequests?: DemoLeaveRequest[];
  _demoCertificateSubmissions?: DemoCertificateSubmission[];
  _demoAttendanceRecords?: DemoAttendanceRecord[];
};

/**
 * Returns the exact skill matrix records for the 15 operators x 8 machines.
 * All dates are dynamically relative to baseDate (defaults to today()).
 */
export function getDemoSkillRecords(baseDate = today()) {
  if (globalForDemo._demoSkillRecords) return globalForDemo._demoSkillRecords;

  const issuedPast = addDaysToStr(baseDate, -365);
  const future1Y = addDaysToStr(baseDate, 365);
  const future2Y = addDaysToStr(baseDate, 730);

  // Exact 5 expiring certs (3, 9, 14, 22, 28 days)
  const exp3 = addDaysToStr(baseDate, 3);
  const exp9 = addDaysToStr(baseDate, 9);
  const exp14 = addDaysToStr(baseDate, 14);
  const exp22 = addDaysToStr(baseDate, 22);
  const exp28 = addDaysToStr(baseDate, 28);

  // 1 overdue cert (-5 days ago)
  const overdue5 = addDaysToStr(baseDate, -5);

  const records = [
    // ── QA-8: Exactly 1 qualified operator overall (Ravi Kumar, level 4, expires in 9 days) ──
    { operatorId: "op-001", skillId: "sk-qa-8", level: 4, issuedOn: issuedPast, certifiedUntil: exp9 }, // Expiring cert #2 (9 days)

    // ── WLD-6: Exactly 2 qualified operators overall, both on Shift A (Shifts B and C are RED) ──
    { operatorId: "op-004", skillId: "sk-wld-6", level: 4, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-005", skillId: "sk-wld-6", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },

    // ── CNC-L1: Shift A has Ravi (4) + Anita (2, expires in 3 days) -> 2 qualified (AMBER).
    // If Ravi is removed, Shift A drops to 1 (RED)! ──
    { operatorId: "op-001", skillId: "sk-cnc-l1", level: 4, issuedOn: issuedPast, certifiedUntil: future2Y },
    { operatorId: "op-002", skillId: "sk-cnc-l1", level: 2, issuedOn: issuedPast, certifiedUntil: exp3 }, // Expiring cert #1 (3 days)
    // Shift B (3 qualified - GREEN)
    { operatorId: "op-006", skillId: "sk-cnc-l1", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-007", skillId: "sk-cnc-l1", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-008", skillId: "sk-cnc-l1", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    // Shift C (3 qualified - GREEN)
    { operatorId: "op-011", skillId: "sk-cnc-l1", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-012", skillId: "sk-cnc-l1", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-013", skillId: "sk-cnc-l1", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },

    // ── CNC-M2: Shift A has Ravi (3) + Suresh (2) -> 2 qualified (AMBER).
    // If Ravi is removed, Shift A drops to 1 (RED)! (Second cell turning red) ──
    { operatorId: "op-001", skillId: "sk-cnc-m2", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-003", skillId: "sk-cnc-m2", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    // Shift B (3 qualified - GREEN): Farhan (3, expires in 14 days), Kavita (4), Deepak (2)
    { operatorId: "op-006", skillId: "sk-cnc-m2", level: 3, issuedOn: issuedPast, certifiedUntil: exp14 }, // Expiring cert #3 (14 days)
    { operatorId: "op-007", skillId: "sk-cnc-m2", level: 4, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-008", skillId: "sk-cnc-m2", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    // Shift C (3 qualified - GREEN)
    { operatorId: "op-011", skillId: "sk-cnc-m2", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-012", skillId: "sk-cnc-m2", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-014", skillId: "sk-cnc-m2", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },

    // ── GRD-3: No level 4 trainer! (Max level 3).
    // Shift A (3 GREEN), Shift B (2 AMBER), Shift C (3 GREEN) ──
    { operatorId: "op-002", skillId: "sk-grd-3", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-003", skillId: "sk-grd-3", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-004", skillId: "sk-grd-3", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    // Shift B (2 AMBER)
    { operatorId: "op-009", skillId: "sk-grd-3", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-010", skillId: "sk-grd-3", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    // Shift C (3 GREEN)
    { operatorId: "op-013", skillId: "sk-grd-3", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-014", skillId: "sk-grd-3", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-015", skillId: "sk-grd-3", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },

    // ── PRS-4: Shift A (3 GREEN), Shift B (3 GREEN), Shift C (2 AMBER)
    // Sunita Rao on Shift C expires in 22 days ──
    { operatorId: "op-001", skillId: "sk-prs-4", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-004", skillId: "sk-prs-4", level: 4, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-005", skillId: "sk-prs-4", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    // Shift B (3 GREEN)
    { operatorId: "op-008", skillId: "sk-prs-4", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-009", skillId: "sk-prs-4", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-010", skillId: "sk-prs-4", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    // Shift C (2 AMBER)
    { operatorId: "op-011", skillId: "sk-prs-4", level: 3, issuedOn: issuedPast, certifiedUntil: exp22 }, // Expiring cert #4 (22 days)
    { operatorId: "op-015", skillId: "sk-prs-4", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },

    // ── INJ-5: Shift A (3 GREEN), Shift B (3 GREEN), Shift C (3 GREEN)
    // Vikram Chauhan expires in 28 days ──
    { operatorId: "op-002", skillId: "sk-inj-5", level: 4, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-003", skillId: "sk-inj-5", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-005", skillId: "sk-inj-5", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    // Shift B (3 GREEN)
    { operatorId: "op-006", skillId: "sk-inj-5", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-007", skillId: "sk-inj-5", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-010", skillId: "sk-inj-5", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    // Shift C (3 GREEN)
    { operatorId: "op-012", skillId: "sk-inj-5", level: 2, issuedOn: issuedPast, certifiedUntil: exp28 }, // Expiring cert #5 (28 days)
    { operatorId: "op-013", skillId: "sk-inj-5", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-014", skillId: "sk-inj-5", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },

    // ── PKG-7: No level 4 trainer! (Max level 3).
    // Suresh Patil has an OVERDUE cert (-5 days ago, level 3).
    // Shift A: Suresh (level 3, expired - not qualified), Meena (level 2), Arjun (level 3), Anita (level 2) -> 3 qualified (GREEN)
    { operatorId: "op-003", skillId: "sk-pkg-7", level: 3, issuedOn: issuedPast, certifiedUntil: overdue5 }, // OVERDUE cert
    { operatorId: "op-004", skillId: "sk-pkg-7", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-005", skillId: "sk-pkg-7", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-002", skillId: "sk-pkg-7", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    // Shift B (3 GREEN)
    { operatorId: "op-008", skillId: "sk-pkg-7", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-009", skillId: "sk-pkg-7", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-010", skillId: "sk-pkg-7", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    // Shift C (3 GREEN)
    { operatorId: "op-012", skillId: "sk-pkg-7", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-014", skillId: "sk-pkg-7", level: 3, issuedOn: issuedPast, certifiedUntil: future1Y },
    { operatorId: "op-015", skillId: "sk-pkg-7", level: 2, issuedOn: issuedPast, certifiedUntil: future1Y },

    // Additional level 1 and 0 learning/supervised records
    { operatorId: "op-001", skillId: "sk-pkg-7", level: 1, issuedOn: null, certifiedUntil: null },
    { operatorId: "op-002", skillId: "sk-wld-6", level: 1, issuedOn: null, certifiedUntil: null },
    { operatorId: "op-003", skillId: "sk-wld-6", level: 1, issuedOn: null, certifiedUntil: null },
    { operatorId: "op-006", skillId: "sk-qa-8", level: 1, issuedOn: null, certifiedUntil: null },
    { operatorId: "op-007", skillId: "sk-qa-8", level: 1, issuedOn: null, certifiedUntil: null },
    { operatorId: "op-011", skillId: "sk-qa-8", level: 1, issuedOn: null, certifiedUntil: null },
    { operatorId: "op-012", skillId: "sk-qa-8", level: 1, issuedOn: null, certifiedUntil: null },
    { operatorId: "op-008", skillId: "sk-wld-6", level: 0, issuedOn: null, certifiedUntil: null },
    { operatorId: "op-009", skillId: "sk-wld-6", level: 0, issuedOn: null, certifiedUntil: null },
    { operatorId: "op-013", skillId: "sk-wld-6", level: 0, issuedOn: null, certifiedUntil: null },
  ];
  globalForDemo._demoSkillRecords = records;
  return globalForDemo._demoSkillRecords;
}

export function updateDemoSkillRecord(operatorId: string, skillId: string, updates: any) {
  if (!globalForDemo._demoSkillRecords) getDemoSkillRecords(today());
  const records = globalForDemo._demoSkillRecords!;
  const idx = records.findIndex(r => r.operatorId === operatorId && r.skillId === skillId);
  const oldLevel = idx !== -1 ? records[idx].level : 0;
  if (idx !== -1) {
    records[idx] = { ...records[idx], ...updates };
  } else {
    records.push({ operatorId, skillId, ...updates });
  }

  const isTrainer = (updates.level ?? oldLevel) >= 4;
  recordDemoHistory({
    operatorId,
    skillId,
    action: isTrainer && oldLevel < 4 ? "PROMOTE" : updates.level !== undefined ? "UPDATE" : "RENEW",
    oldLevel,
    newLevel: updates.level !== undefined ? updates.level : oldLevel,
    newIssuedOn: updates.issuedOn || null,
    newCertifiedUntil: updates.certifiedUntil || null,
    reason: updates.reason || (isTrainer ? "Promoted to L4 Master Trainer" : "Manual update in Skill Grid"),
  });
}

export function deleteDemoSkillRecord(operatorId: string, skillId: string) {
  if (!globalForDemo._demoSkillRecords) getDemoSkillRecords(today());
  const records = globalForDemo._demoSkillRecords!;
  const rec = records.find(r => r.operatorId === operatorId && r.skillId === skillId);
  globalForDemo._demoSkillRecords = records.filter(r => !(r.operatorId === operatorId && r.skillId === skillId));

  recordDemoHistory({
    operatorId,
    skillId,
    action: "DELETE",
    oldLevel: rec ? rec.level : 0,
    newLevel: 0,
    reason: "Deleted skill qualification",
  });
}

export function getDemoHistory(baseDate = today()) {
  if (globalForDemo._demoHistory) return globalForDemo._demoHistory;

  const records = getDemoSkillRecords(baseDate);
  const opMap = new Map(DEMO_OPERATORS.map(o => [o.id, o]));
  const machineMap = new Map(DEMO_MACHINES.map(m => [m.id, m]));

  const list: any[] = [];
  let idCounter = 1;

  for (const r of records) {
    if (r.level > 0) {
      const op = opMap.get(r.operatorId);
      const machine = machineMap.get(r.skillId);
      const isTrainer = r.level >= 4;
      list.push({
        id: `hist-seed-${idCounter++}`,
        operatorId: r.operatorId,
        skillId: r.skillId,
        action: isTrainer ? "PROMOTE" : "CERTIFY",
        oldLevel: r.level > 1 ? r.level - 1 : 0,
        newLevel: r.level,
        oldIssuedOn: r.issuedOn ? addDaysToStr(r.issuedOn, -365) : null,
        newIssuedOn: r.issuedOn,
        oldCertifiedUntil: r.certifiedUntil ? addDaysToStr(r.certifiedUntil, -365) : null,
        newCertifiedUntil: r.certifiedUntil,
        changedBy: "usr-asha-1",
        changedByName: "Asha Verma",
        changedAt: new Date(Date.now() - (idCounter * 14400000)).toISOString(),
        reason: isTrainer ? "Qualified as Master Trainer" : "Annual competency certification",
        operator: op,
        skill: machine,
      });
    }
  }

  // Sort descending by changedAt
  list.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
  globalForDemo._demoHistory = list;
  return globalForDemo._demoHistory;
}

export function recordDemoHistory(entry: any) {
  if (!globalForDemo._demoHistory) getDemoHistory(today());
  const opMap = new Map(DEMO_OPERATORS.map(o => [o.id, o]));
  const machineMap = new Map(DEMO_MACHINES.map(m => [m.id, m]));
  globalForDemo._demoHistory!.unshift({
    id: `hist-mod-${Date.now()}`,
    changedAt: new Date().toISOString(),
    changedBy: "usr-asha-1",
    changedByName: "Asha Verma",
    operator: opMap.get(entry.operatorId),
    skill: machineMap.get(entry.skillId),
    ...entry,
  });
}

/**
 * Returns 45 trailing accepted assignments skewed so top 3 operators have >= 2x the median (median = 2).
 */
export function getDemoAssignments(baseDate = today()) {
  const list: {
    operatorId: string;
    skillId: string;
    shiftId: string;
    assignmentDate: string;
    status: "accepted";
    verdict: "green";
  }[] = [];

  // Top 3 operators:
  // op-001 (Ravi Kumar): 10 assignments
  for (let i = 0; i < 10; i++) {
    list.push({
      operatorId: "op-001",
      skillId: "sk-cnc-l1",
      shiftId: "shift-a",
      assignmentDate: addDaysToStr(baseDate, -((i % 12) + 1)),
      status: "accepted",
      verdict: "green",
    });
  }

  // op-002 (Anita Sharma): 9 assignments
  for (let i = 0; i < 9; i++) {
    list.push({
      operatorId: "op-002",
      skillId: "sk-inj-5",
      shiftId: "shift-a",
      assignmentDate: addDaysToStr(baseDate, -((i % 12) + 1)),
      status: "accepted",
      verdict: "green",
    });
  }

  // op-006 (Farhan Sheikh): 8 assignments
  for (let i = 0; i < 8; i++) {
    list.push({
      operatorId: "op-006",
      skillId: "sk-cnc-m2",
      shiftId: "shift-b",
      assignmentDate: addDaysToStr(baseDate, -((i % 12) + 1)),
      status: "accepted",
      verdict: "green",
    });
  }

  // Remaining 18 assignments spread across remaining 12 operators (1 or 2 each; median is 2)
  const remainingOps = [
    { op: "op-003", count: 2, skill: "sk-grd-3", shift: "shift-a" },
    { op: "op-004", count: 2, skill: "sk-wld-6", shift: "shift-a" },
    { op: "op-005", count: 2, skill: "sk-prs-4", shift: "shift-a" },
    { op: "op-007", count: 2, skill: "sk-cnc-m2", shift: "shift-b" },
    { op: "op-008", count: 1, skill: "sk-prs-4", shift: "shift-b" },
    { op: "op-009", count: 2, skill: "sk-grd-3", shift: "shift-b" },
    { op: "op-010", count: 1, skill: "sk-inj-5", shift: "shift-b" },
    { op: "op-011", count: 2, skill: "sk-cnc-l1", shift: "shift-c" },
    { op: "op-012", count: 1, skill: "sk-inj-5", shift: "shift-c" },
    { op: "op-013", count: 1, skill: "sk-grd-3", shift: "shift-c" },
    { op: "op-014", count: 1, skill: "sk-cnc-m2", shift: "shift-c" },
    { op: "op-015", count: 1, skill: "sk-prs-4", shift: "shift-c" },
  ];

  for (const item of remainingOps) {
    for (let i = 0; i < item.count; i++) {
      list.push({
        operatorId: item.op,
        skillId: item.skill,
        shiftId: item.shift,
        assignmentDate: addDaysToStr(baseDate, -((i + 1) * 3)),
        status: "accepted",
        verdict: "green",
      });
    }
  }

  return list;
}

export interface DemoLeaveRequest {
  id: string;
  operatorId: string;
  leaveType: "CASUAL" | "SICK" | "ANNUAL" | "TRAINING";
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface DemoCertificateSubmission {
  id: string;
  operatorId: string;
  skillId: string;
  certificateNumber: string;
  level: number;
  issuedOn: string;
  certifiedUntil: string;
  fileName?: string;
  notes?: string;
  status: "VERIFIED" | "PENDING" | "REJECTED";
  submittedAt: string;
}

export function getDemoLeaveRequests(operatorId?: string): DemoLeaveRequest[] {
  if (!globalForDemo._demoLeaveRequests) {
    const base = today();
    globalForDemo._demoLeaveRequests = [
      {
        id: "leave-101",
        operatorId: "op-001",
        leaveType: "CASUAL",
        startDate: addDaysToStr(base, -14),
        endDate: addDaysToStr(base, -13),
        daysCount: 2,
        reason: "Family wedding in Pune",
        status: "APPROVED",
        submittedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        reviewedBy: "Rohit Kulkarni",
        reviewedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
      {
        id: "leave-102",
        operatorId: "op-001",
        leaveType: "SICK",
        startDate: addDaysToStr(base, 5),
        endDate: addDaysToStr(base, 5),
        daysCount: 1,
        reason: "Annual health checkup and eye examination",
        status: "PENDING",
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "leave-103",
        operatorId: "op-002",
        leaveType: "ANNUAL",
        startDate: addDaysToStr(base, 10),
        endDate: addDaysToStr(base, 14),
        daysCount: 5,
        reason: "Festival holiday with family",
        status: "APPROVED",
        submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        reviewedBy: "Asha Verma",
        reviewedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ];
  }

  if (operatorId) {
    return globalForDemo._demoLeaveRequests.filter((l) => l.operatorId === operatorId);
  }
  return globalForDemo._demoLeaveRequests;
}

export function createDemoLeaveRequest(data: Omit<DemoLeaveRequest, "id" | "submittedAt" | "status">): DemoLeaveRequest {
  if (!globalForDemo._demoLeaveRequests) getDemoLeaveRequests();
  const newLeave: DemoLeaveRequest = {
    ...data,
    id: `leave-${Date.now()}`,
    status: "PENDING",
    submittedAt: new Date().toISOString(),
  };
  globalForDemo._demoLeaveRequests!.unshift(newLeave);
  return newLeave;
}

export function cancelDemoLeaveRequest(id: string): boolean {
  if (!globalForDemo._demoLeaveRequests) getDemoLeaveRequests();
  const idx = globalForDemo._demoLeaveRequests!.findIndex((l) => l.id === id);
  if (idx !== -1 && globalForDemo._demoLeaveRequests![idx].status === "PENDING") {
    globalForDemo._demoLeaveRequests!.splice(idx, 1);
    return true;
  }
  return false;
}

export function reviewDemoLeaveRequest(
  id: string,
  status: "APPROVED" | "REJECTED",
  reviewerName: string,
  reviewerNotes?: string
): DemoLeaveRequest | null {
  if (!globalForDemo._demoLeaveRequests) getDemoLeaveRequests();
  const leave = globalForDemo._demoLeaveRequests!.find((l) => l.id === id);
  if (!leave) return null;
  leave.status = status;
  leave.reviewedBy = reviewerName;
  leave.reviewedAt = new Date().toISOString();
  if (reviewerNotes) {
    leave.reason = `${leave.reason} [Note: ${reviewerNotes}]`;
  }
  return leave;
}

export function getDemoCertificateSubmissions(operatorId?: string): DemoCertificateSubmission[] {
  if (!globalForDemo._demoCertificateSubmissions) {
    const base = today();
    globalForDemo._demoCertificateSubmissions = [
      {
        id: "cert-sub-201",
        operatorId: "op-001",
        skillId: "sk-cnc-l1",
        certificateNumber: "CERT-CNC-2024-001",
        level: 4,
        issuedOn: addDaysToStr(base, -365),
        certifiedUntil: addDaysToStr(base, 730),
        fileName: "cnc_lathe_master_trainer_ravi.pdf",
        notes: "Master Trainer certification by Tool Room & Training Centre",
        status: "VERIFIED",
        submittedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        id: "cert-sub-202",
        operatorId: "op-001",
        skillId: "sk-qa-8",
        certificateNumber: "CERT-QA-2025-089",
        level: 4,
        issuedOn: addDaysToStr(base, -360),
        certifiedUntil: addDaysToStr(base, 3), // Expiring soon
        fileName: "cmm_inspection_l4_cert.pdf",
        notes: "Zeiss CMM Operator & Trainer Certificate",
        status: "VERIFIED",
        submittedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ];
  }

  if (operatorId) {
    return globalForDemo._demoCertificateSubmissions.filter((c) => c.operatorId === operatorId);
  }
  return globalForDemo._demoCertificateSubmissions;
}

export function createDemoCertificateSubmission(
  data: Omit<DemoCertificateSubmission, "id" | "submittedAt" | "status">
): DemoCertificateSubmission {
  if (!globalForDemo._demoCertificateSubmissions) getDemoCertificateSubmissions();
  const newCert: DemoCertificateSubmission = {
    ...data,
    id: `cert-sub-${Date.now()}`,
    status: "VERIFIED",
    submittedAt: new Date().toISOString(),
  };
  globalForDemo._demoCertificateSubmissions!.unshift(newCert);

  // Also update skill record in the grid
  updateDemoSkillRecord(data.operatorId, data.skillId, {
    level: data.level,
    issuedOn: data.issuedOn,
    certifiedUntil: data.certifiedUntil,
    reason: `Certificate submission ${data.certificateNumber}`,
  });

  return newCert;
}

export interface DemoAttendanceRecord {
  id: string;
  operatorId: string;
  date: string; // YYYY-MM-DD
  status: "PRESENT" | "ABSENT" | "ON_LEAVE" | "HALF_DAY" | "LATE";
  punchInTime: string | null;
  punchOutTime: string | null;
  biometricDeviceId: string | null;
  biometricVerified: boolean;
  markedBy: string;
  notes?: string;
  updatedAt: string;
}

export function getDemoAttendance(filterDate?: string): DemoAttendanceRecord[] {
  const currentDate = filterDate || today();

  if (!globalForDemo._demoAttendanceRecords) {
    const punchTimes = [
      "05:48 AM", "05:52 AM", "05:55 AM", "05:58 AM", null, // op-005 absent initially
      "13:42 PM", "13:46 PM", "13:51 PM", "13:55 PM", "13:58 PM",
      "21:40 PM", "21:45 PM", "21:49 PM", null, "21:58 PM", // op-014 absent initially
    ];

    globalForDemo._demoAttendanceRecords = DEMO_OPERATORS.map((op, idx) => {
      const punchIn = punchTimes[idx % punchTimes.length];
      const isAbsent = punchIn === null;
      // If op-003 has approved leave on current date or op-008
      const isOnLeave = op.id === "op-008"; // Deepak Verma on pre-approved leave

      const status: DemoAttendanceRecord["status"] = isOnLeave
        ? "ON_LEAVE"
        : isAbsent
        ? "ABSENT"
        : "PRESENT";

      return {
        id: `att-${op.id}-${currentDate}`,
        operatorId: op.id,
        date: currentDate,
        status,
        punchInTime: status === "PRESENT" ? punchIn : null,
        punchOutTime: status === "PRESENT" ? (idx < 5 ? "14:02 PM" : null) : null,
        biometricDeviceId: status === "PRESENT" ? "BioStation 3 - Turnstile Gate #1" : null,
        biometricVerified: status === "PRESENT",
        markedBy: status === "PRESENT" ? "BIOMETRIC_DEVICE" : "SYSTEM",
        notes: isOnLeave ? "Approved medical leave" : isAbsent ? "No biometric punch record detected" : "Biometric RFID punch verified",
        updatedAt: new Date().toISOString(),
      };
    });
  }

  return globalForDemo._demoAttendanceRecords.filter(
    (record) => !filterDate || record.date === filterDate
  );
}

export function updateDemoAttendance(
  operatorId: string,
  status: DemoAttendanceRecord["status"],
  notes?: string,
  adminName: string = "Admin"
): DemoAttendanceRecord {
  const currentDate = today();
  if (!globalForDemo._demoAttendanceRecords) getDemoAttendance(currentDate);

  let record = globalForDemo._demoAttendanceRecords!.find(
    (r) => r.operatorId === operatorId && r.date === currentDate
  );

  if (!record) {
    record = {
      id: `att-${operatorId}-${currentDate}`,
      operatorId,
      date: currentDate,
      status,
      punchInTime: status === "PRESENT" ? "06:00 AM" : null,
      punchOutTime: null,
      biometricDeviceId: null,
      biometricVerified: false,
      markedBy: adminName,
      notes: notes || `Manually marked as ${status} by ${adminName}`,
      updatedAt: new Date().toISOString(),
    };
    globalForDemo._demoAttendanceRecords!.push(record);
  } else {
    record.status = status;
    record.notes = notes || `Status changed to ${status} by ${adminName}`;
    record.markedBy = adminName;
    record.updatedAt = new Date().toISOString();
    if (status === "PRESENT" && !record.punchInTime) {
      record.punchInTime = "06:00 AM (Manual)";
    } else if (status === "ABSENT" || status === "ON_LEAVE") {
      record.punchInTime = null;
      record.punchOutTime = null;
    }
  }

  return record;
}

export function syncBiometricAttendance(filterDate?: string): {
  success: boolean;
  totalSynced: number;
  presentCount: number;
  absentCount: number;
  onLeaveCount: number;
  device: string;
  syncedAt: string;
} {
  const currentDate = filterDate || today();
  const records = getDemoAttendance(currentDate);

  // Re-sync with biometric machine punch logs:
  // Operators who have not punched and are not on leave get set to ABSENT
  let presentCount = 0;
  let absentCount = 0;
  let onLeaveCount = 0;

  for (const record of records) {
    if (record.status === "ON_LEAVE") {
      onLeaveCount++;
    } else if (record.punchInTime) {
      record.status = "PRESENT";
      record.biometricVerified = true;
      record.biometricDeviceId = "BioStation 3 - Turnstile Gate #1";
      record.markedBy = "BIOMETRIC_DEVICE";
      record.updatedAt = new Date().toISOString();
      presentCount++;
    } else {
      record.status = "ABSENT";
      record.biometricVerified = false;
      record.notes = "No biometric punch record detected at factory turnstile gate";
      record.markedBy = "BIOMETRIC_DEVICE";
      record.updatedAt = new Date().toISOString();
      absentCount++;
    }
  }

  return {
    success: true,
    totalSynced: records.length,
    presentCount,
    absentCount,
    onLeaveCount,
    device: "BioStation 3 (Main Gate Turnstiles 1 & 2, IP: 192.168.1.108:4370)",
    syncedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}
