import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import { db } from "@/lib/db";
import { today, formatDateStr, parseDate } from "@/lib/domain/rules";
import { buildCoverage, CoverageCellView } from "@/lib/domain/coverage";
import { riskScore } from "@/lib/domain/risk";
import {
  DEMO_MACHINES,
  DEMO_OPERATORS,
  DEMO_SHIFTS,
  getDemoSkillRecords,
} from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  asOf: z.string().optional(),
});

/**
 * GET /api/reports/gaps?asOf=
 * Returns the comprehensive skills gap report:
 * 1. spofs: DB-side aggregation of skills with <2 qualified operators across all shifts
 * 2. redCells: Machine-shift pairs with <2 qualified operators from the coverage pivot
 * 3. topRisks: Top 3 riskiest machines ranked by explainable risk score
 */
export const GET = withOrgAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return validationError(parsed);
  }

  const asOf = parsed.data.asOf || today();
  const asOfDate = parseDate(asOf)!;
  const generatedAt = new Date().toISOString();

  try {
    // 1. Fetch DB data in parallel
    const [shifts, skills, operators, records, dbGroupBy] = await Promise.all([
      db.sfShift.findMany({
        where: { orgId: ctx.orgId },
        orderBy: { code: "asc" },
        select: { id: true, code: true, startTime: true, endTime: true },
      }),
      db.sfSkill.findMany({
        where: { orgId: ctx.orgId, isActive: true },
        orderBy: [{ criticality: "desc" }, { code: "asc" }],
        select: { id: true, code: true, name: true, nameHi: true, lineKey: true, criticality: true, isActive: true },
      }),
      db.sfOperator.findMany({
        where: { orgId: ctx.orgId, isActive: true },
        select: { id: true, name: true, shiftId: true, isActive: true },
      }),
      db.sfOperatorSkill.findMany({
        where: { orgId: ctx.orgId },
        take: 1000,
        select: { operatorId: true, skillId: true, level: true, issuedOn: true, certifiedUntil: true },
      }),
      // Compulsory DB-side aggregation for SPOFs
      db.sfOperatorSkill.groupBy({
        by: ["skillId"],
        where: {
          orgId: ctx.orgId,
          level: { gte: 2 },
          operator: { isActive: true },
          OR: [{ certifiedUntil: null }, { certifiedUntil: { gte: asOfDate } }],
        },
        _count: { _all: true },
      }),
    ]);

    // 2. Build coverage pivot
    const mappedRecords = records.map((r) => ({
      operatorId: r.operatorId,
      skillId: r.skillId,
      level: r.level,
      issuedOn: r.issuedOn ? formatDateStr(parseDate(r.issuedOn)) : null,
      certifiedUntil: r.certifiedUntil ? formatDateStr(parseDate(r.certifiedUntil)) : null,
    }));

    const coverage = buildCoverage(operators, skills, shifts, mappedRecords, asOf);

    // 3. Compute risk scores for all machines
    const cellMap = new Map<string, CoverageCellView>();
    for (const c of coverage.cells) {
      cellMap.set(`${c.skillId}_${c.shiftId}`, c);
    }

    const scoredMachines = skills.map((skill) => {
      const skillCells = shifts
        .map((s) => cellMap.get(`${skill.id}_${s.id}`))
        .filter((c): c is CoverageCellView => Boolean(c));

      const risk = riskScore(skill.criticality, skillCells);
      return {
        skill,
        risk,
      };
    });

    scoredMachines.sort((a, b) => {
      if (b.risk.score !== a.risk.score) return b.risk.score - a.risk.score;
      if (b.risk.weighted !== a.risk.weighted) return b.risk.weighted - a.risk.weighted;
      const aTot = coverage.totals.find((t) => t.skillId === a.skill.id)?.totalQualified ?? 0;
      const bTot = coverage.totals.find((t) => t.skillId === b.skill.id)?.totalQualified ?? 0;
      return aTot - bTot;
    });
    const topRisks = scoredMachines.slice(0, 3);

    // 4. Merge DB-side groupBy counts with active skills to identify SPOFs (<2 qualified)
    const groupByCountMap = new Map<string, number>();
    for (const item of dbGroupBy) {
      groupByCountMap.set(item.skillId, item._count._all);
    }

    const spofs = skills
      .map((skill) => {
        const count = groupByCountMap.get(skill.id) ?? 0;
        const totalView = coverage.totals.find((t) => t.skillId === skill.id);
        const skillCells = shifts
          .map((s) => cellMap.get(`${skill.id}_${s.id}`))
          .filter((c): c is CoverageCellView => Boolean(c));

        const risk = riskScore(skill.criticality, skillCells);

        const loneOperators = skillCells
          .flatMap((c) => c.operators)
          .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);

        return {
          skill,
          qualifiedCount: count,
          trainerCount: totalView?.trainerCount ?? 0,
          isZeroQualified: count === 0,
          loneOperators,
          risk,
        };
      })
      .filter((s) => s.qualifiedCount < 2)
      .sort((a, b) => b.risk.score - a.risk.score);

    // 5. Red cells (<2 qualified on a machine-shift pair)
    const redCells = coverage.cells
      .filter((c) => c.status === "RED")
      .map((c) => {
        const skill = skills.find((s) => s.id === c.skillId)!;
        const shift = shifts.find((s) => s.id === c.shiftId)!;
        return {
          ...c,
          skill,
          shift,
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        asOf,
        generatedAt,
        generatedBy: ctx.userName,
        topRisks,
        spofs,
        redCells,
      },
    });
  } catch (err: unknown) {
    // In-memory fallback
    const coverage = buildCoverage(
      DEMO_OPERATORS,
      DEMO_MACHINES,
      DEMO_SHIFTS,
      getDemoSkillRecords(asOf),
      asOf
    );

    const cellMap = new Map<string, CoverageCellView>();
    for (const c of coverage.cells) {
      cellMap.set(`${c.skillId}_${c.shiftId}`, c);
    }

    const scoredMachines = DEMO_MACHINES.map((skill) => {
      const skillCells = DEMO_SHIFTS
        .map((s) => cellMap.get(`${skill.id}_${s.id}`))
        .filter((c): c is CoverageCellView => Boolean(c));

      const risk = riskScore(skill.criticality, skillCells);
      return {
        skill,
        risk,
      };
    });

    scoredMachines.sort((a, b) => {
      if (b.risk.score !== a.risk.score) return b.risk.score - a.risk.score;
      if (b.risk.weighted !== a.risk.weighted) return b.risk.weighted - a.risk.weighted;
      const aTot = coverage.totals.find((t) => t.skillId === a.skill.id)?.totalQualified ?? 0;
      const bTot = coverage.totals.find((t) => t.skillId === b.skill.id)?.totalQualified ?? 0;
      return aTot - bTot;
    });
    const topRisks = scoredMachines.slice(0, 3);

    const spofs = DEMO_MACHINES.map((skill) => {
      const totalView = coverage.totals.find((t) => t.skillId === skill.id);
      const skillCells = DEMO_SHIFTS
        .map((s) => cellMap.get(`${skill.id}_${s.id}`))
        .filter((c): c is CoverageCellView => Boolean(c));

      const risk = riskScore(skill.criticality, skillCells);
      const loneOperators = skillCells
        .flatMap((c) => c.operators)
        .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);

      return {
        skill,
        qualifiedCount: totalView?.totalQualified ?? 0,
        trainerCount: totalView?.trainerCount ?? 0,
        isZeroQualified: (totalView?.totalQualified ?? 0) === 0,
        loneOperators,
        risk,
      };
    })
      .filter((s) => s.qualifiedCount < 2)
      .sort((a, b) => b.risk.score - a.risk.score);

    const redCells = coverage.cells
      .filter((c) => c.status === "RED")
      .map((c) => ({
        ...c,
        skill: DEMO_MACHINES.find((s) => s.id === c.skillId)!,
        shift: DEMO_SHIFTS.find((s) => s.id === c.shiftId)!,
      }));

    return NextResponse.json({
      success: true,
      data: {
        asOf,
        generatedAt,
        generatedBy: ctx.userName,
        topRisks,
        spofs,
        redCells,
      },
    });
  }
});
