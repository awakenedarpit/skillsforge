import { addDaysToStr, today } from "../domain/rules";

export const DEMO_ORG = {
  id: "org-demo-manufacturing",
  slug: "demo-manufacturing",
  name: "SkillsForge Manufacturing Plant",
};

export const DEMO_USERS = [
  {
    id: "usr-asha-1",
    email: "asha.verma@skillsforge.quikit.io",
    name: "Asha Verma",
    role: "org_admin",
  },
  {
    id: "usr-rohit-2",
    email: "rohit.kulkarni@skillsforge.quikit.io",
    name: "Rohit Kulkarni",
    role: "app_admin", // supervisor
  },
  {
    id: "usr-vikas-3",
    email: "vikas.rao@skillsforge.quikit.io",
    name: "Vikas Rao",
    role: "member", // read-only viewer
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
  { id: "op-001", employeeCode: "OP-001", name: "Ravi Kumar", shiftId: "shift-a", isActive: true },
  { id: "op-002", employeeCode: "OP-002", name: "Anita Sharma", shiftId: "shift-a", isActive: true },
  { id: "op-003", employeeCode: "OP-003", name: "Suresh Patil", shiftId: "shift-a", isActive: true },
  { id: "op-004", employeeCode: "OP-004", name: "Meena Iyer", shiftId: "shift-a", isActive: true },
  { id: "op-005", employeeCode: "OP-005", name: "Arjun Singh", shiftId: "shift-a", isActive: true },

  // Shift B (5 operators)
  { id: "op-006", employeeCode: "OP-006", name: "Farhan Sheikh", shiftId: "shift-b", isActive: true },
  { id: "op-007", employeeCode: "OP-007", name: "Kavita Nair", shiftId: "shift-b", isActive: true },
  { id: "op-008", employeeCode: "OP-008", name: "Deepak Verma", shiftId: "shift-b", isActive: true },
  { id: "op-009", employeeCode: "OP-009", name: "Pooja Desai", shiftId: "shift-b", isActive: true },
  { id: "op-010", employeeCode: "OP-010", name: "Imran Khan", shiftId: "shift-b", isActive: true },

  // Shift C (5 operators)
  { id: "op-011", employeeCode: "OP-011", name: "Sunita Rao", shiftId: "shift-c", isActive: true },
  { id: "op-012", employeeCode: "OP-012", name: "Vikram Chauhan", shiftId: "shift-c", isActive: true },
  { id: "op-013", employeeCode: "OP-013", name: "Neha Joshi", shiftId: "shift-c", isActive: true },
  { id: "op-014", employeeCode: "OP-014", name: "Rahul Mehta", shiftId: "shift-c", isActive: true },
  { id: "op-015", employeeCode: "OP-015", name: "Lakshmi Reddy", shiftId: "shift-c", isActive: true },
];

/**
 * Returns the exact skill matrix records for the 15 operators x 8 machines.
 * All dates are dynamically relative to baseDate (defaults to today()).
 */
export function getDemoSkillRecords(baseDate = today()) {
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

  return [
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
