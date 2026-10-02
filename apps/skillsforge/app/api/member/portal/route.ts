import { NextRequest, NextResponse } from "next/server";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import {
  DEMO_OPERATORS,
  DEMO_MACHINES,
  DEMO_SHIFTS,
  getDemoSkillRecords,
  getDemoLeaveRequests,
  getDemoCertificateSubmissions,
} from "@/lib/demo/seedData";
import { today, addDaysToStr, diffDays } from "@/lib/domain/rules";

export const dynamic = "force-dynamic";

export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const requestedOpId = searchParams.get("operatorId");
  const asOf = today();

  const sessionOperatorId = ctx.operatorId;
  const operatorId = requestedOpId || sessionOperatorId;

  if (!operatorId) {
    return NextResponse.json({
      success: true,
      data: {
        operator: null,
        todayDuty: null,
        scheduleDays: [],
        certificates: [],
        leaveSummary: { casualRemaining: 0, sickRemaining: 0, totalRemaining: 0 },
        leaves: [],
      },
    });
  }

  const operator = DEMO_OPERATORS.find((o) => o.id === operatorId);
  if (!operator) {
    return NextResponse.json({
      success: true,
      data: {
        operator: null,
        todayDuty: null,
        scheduleDays: [],
        certificates: [],
        leaveSummary: { casualRemaining: 0, sickRemaining: 0, totalRemaining: 0 },
        leaves: [],
      },
    });
  }
  const shift = DEMO_SHIFTS.find((s) => s.id === operator.shiftId) || DEMO_SHIFTS[0];

  // 1. Fetch skill records for this operator
  const allRecords = getDemoSkillRecords(asOf);
  const operatorRecords = allRecords.filter((r) => r.operatorId === operator.id);

  // Map with machine metadata
  const certificates = DEMO_MACHINES.map((machine) => {
    const record = operatorRecords.find((r) => r.skillId === machine.id);
    const level = record ? record.level : 0;
    const certUntil = record?.certifiedUntil || null;
    const daysLeft = certUntil ? diffDays(certUntil, asOf) : null;
    let status: "certified" | "expiring_soon" | "expired" | "not_certified" = "not_certified";

    if (level > 0) {
      if (daysLeft !== null && daysLeft < 0) {
        status = "expired";
      } else if (daysLeft !== null && daysLeft <= 30) {
        status = "expiring_soon";
      } else {
        status = "certified";
      }
    }

    return {
      machine,
      level,
      isTrainer: level >= 4,
      issuedOn: record?.issuedOn || null,
      certifiedUntil: certUntil,
      daysRemaining: daysLeft,
      status,
    };
  });

  // 2. Determine today's allotted duty & machine
  // Look for primary qualified machine (highest level) on operator's shift
  const qualifiedMachines = certificates.filter((c) => c.level >= 2);
  const todayMachine = qualifiedMachines[0]?.machine || DEMO_MACHINES[0];
  const primaryCompetency = qualifiedMachines[0] || certificates[0];

  const todayDuty = {
    date: asOf,
    shift: {
      id: shift.id,
      code: shift.code,
      name: `Shift ${shift.code} (Morning)`,
      startTime: shift.startTime,
      endTime: shift.endTime,
      duration: "8 Hours",
    },
    station: {
      bay: "Bay 2 · Precision Machining Cell",
      line: todayMachine.lineKey,
      machineId: todayMachine.id,
      machineCode: todayMachine.code,
      machineName: todayMachine.name,
      machineNameHi: todayMachine.nameHi,
      criticality: todayMachine.criticality,
    },
    supervisor: "Rohit Kulkarni (Shop Floor Supervisor)",
    competencyLevel: primaryCompetency.level,
    isTrainer: primaryCompetency.isTrainer,
    status: "CONFIRMED_ON_DUTY",
    preOperationChecks: [
      { id: "chk-ppe", label: "Mandatory PPE Equipped (Goggles, Steel-toe, Earplugs)", passed: true },
      { id: "chk-e-stop", label: "Emergency Stop Safety Switch Tested", passed: true },
      { id: "chk-zero", label: "Spindle & Axis Zero Datum Calibrated", passed: true },
      { id: "chk-coolant", label: "Coolant & Lubrication Levels Verified", passed: true },
    ],
  };

  // 3. Generate 7-day upcoming duty schedule
  const scheduleDays = [];
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const parsedToday = new Date(asOf);

  for (let i = 0; i < 7; i++) {
    const dStr = addDaysToStr(asOf, i);
    const dObj = new Date(dStr);
    const isWeekend = dObj.getDay() === 0; // Sunday off
    const assignedM = isWeekend ? null : DEMO_MACHINES[i % qualifiedMachines.length || 0];

    scheduleDays.push({
      date: dStr,
      dayName: daysOfWeek[dObj.getDay()],
      isToday: i === 0,
      isOffDay: isWeekend,
      shiftCode: isWeekend ? "OFF" : shift.code,
      shiftTiming: isWeekend ? "Weekly Rest" : `${shift.startTime} - ${shift.endTime}`,
      machine: assignedM,
      status: isWeekend ? "WEEKLY_OFF" : i === 0 ? "IN_PROGRESS" : "SCHEDULED",
    });
  }

  // 4. Leave summary and requests
  const leaves = getDemoLeaveRequests(operator.id);
  const approvedLeaves = leaves.filter((l) => l.status === "APPROVED");
  const daysTaken = approvedLeaves.reduce((acc, curr) => acc + curr.daysCount, 0);
  const totalQuota = 14;
  const balance = Math.max(0, totalQuota - daysTaken);

  // 5. Certificate submissions
  const submissions = getDemoCertificateSubmissions(operator.id);

  return NextResponse.json({
    success: true,
    data: {
      asOf,
      operator: {
        id: operator.id,
        name: operator.name,
        employeeCode: operator.employeeCode,
        shiftId: operator.shiftId,
        shiftCode: shift.code,
        plantName: "SkillsForge Manufacturing Plant",
        department: "Precision Production & Machining",
      },
      availableOperators: DEMO_OPERATORS.map((op) => ({
        id: op.id,
        name: op.name,
        employeeCode: op.employeeCode,
        shiftCode: DEMO_SHIFTS.find((s) => s.id === op.shiftId)?.code || "A",
      })),
      todayDuty,
      scheduleDays,
      certificates,
      leaveSummary: {
        totalQuota,
        daysTaken,
        balance,
        pendingCount: leaves.filter((l) => l.status === "PENDING").length,
      },
      leaves,
      submissions,
    },
  });
});
