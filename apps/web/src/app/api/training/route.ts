import { NextResponse } from 'next/server';
import { recommendCrossTraining, coverageCells, WorkloadStats } from '@quikit/shared';

const MOCK_OPERATORS = [
  { id: 'op-1', name: 'Alice Smith',    shiftId: 'shift-a', isActive: true },
  { id: 'op-2', name: 'Bob Johnson',    shiftId: 'shift-a', isActive: true },
  { id: 'op-3', name: 'Carol White',    shiftId: 'shift-a', isActive: true },
  { id: 'op-4', name: 'David Lee',      shiftId: 'shift-b', isActive: true },
  { id: 'op-5', name: 'Eve Martinez',   shiftId: 'shift-b', isActive: true },
  { id: 'op-6', name: 'Frank Garcia',   shiftId: 'shift-b', isActive: true },
  { id: 'op-7', name: 'Grace Kim',      shiftId: 'shift-c', isActive: true },
  { id: 'op-8', name: 'Henry Wilson',   shiftId: 'shift-c', isActive: true },
  { id: 'op-9', name: 'Ivan Chen',      shiftId: 'shift-c', isActive: true },
];

const MOCK_SKILLS = [
  { id: 'skill-1', code: 'WLD-01', name: 'Arc Welding',        line: 'Body',  criticality: 3, isActive: true },
  { id: 'skill-2', code: 'ASS-01', name: 'Door Assembly',      line: 'Trim',  criticality: 2, isActive: true },
  { id: 'skill-3', code: 'QC-01',  name: 'Quality Inspection', line: 'Paint', criticality: 3, isActive: true },
  { id: 'skill-4', code: 'ROB-01', name: 'Robot Operation',    line: 'Body',  criticality: 3, isActive: true },
];

const MOCK_SHIFTS = [
  { id: 'shift-a', name: 'Shift A (06:00-14:00)' },
  { id: 'shift-b', name: 'Shift B (14:00-22:00)' },
  { id: 'shift-c', name: 'Shift C (22:00-06:00)' },
];

const future = (days: number) => new Date(Date.now() + days * 86400000);

const MOCK_RECORDS = [
  { operatorId: 'op-1', skillId: 'skill-1', level: 4, issuedOn: new Date(), certifiedUntil: future(180) },
  { operatorId: 'op-2', skillId: 'skill-1', level: 3, issuedOn: new Date(), certifiedUntil: future(25) },
  { operatorId: 'op-1', skillId: 'skill-2', level: 3, issuedOn: new Date(), certifiedUntil: future(90)  },
  { operatorId: 'op-4', skillId: 'skill-1', level: 4, issuedOn: new Date(), certifiedUntil: future(60)  },
  { operatorId: 'op-5', skillId: 'skill-1', level: 2, issuedOn: new Date(), certifiedUntil: future(120) },
  { operatorId: 'op-6', skillId: 'skill-3', level: 4, issuedOn: new Date(), certifiedUntil: future(200) },
  { operatorId: 'op-7', skillId: 'skill-4', level: 4, issuedOn: new Date(), certifiedUntil: future(365) },
  { operatorId: 'op-8', skillId: 'skill-4', level: 3, issuedOn: new Date(), certifiedUntil: future(10)  },
  { operatorId: 'op-1', skillId: 'skill-4', level: 3, issuedOn: new Date(), certifiedUntil: future(80)  },
];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dateStr = url.searchParams.get('date');
    const onDate = dateStr ? new Date(dateStr) : new Date();

    const coverage = coverageCells(MOCK_OPERATORS, MOCK_SKILLS, MOCK_SHIFTS, MOCK_RECORDS, onDate);

    const workloadStats: WorkloadStats = {
      counts: { 'op-1': 12, 'op-2': 8, 'op-3': 3, 'op-4': 10, 'op-5': 5, 'op-6': 15, 'op-7': 7, 'op-8': 4, 'op-9': 2 },
      median: 7,
    };

    const suggestions = recommendCrossTraining(
      MOCK_OPERATORS, MOCK_SKILLS, MOCK_SHIFTS, MOCK_RECORDS, coverage, onDate, workloadStats
    );

    return NextResponse.json({ suggestions, onDate });
  } catch (error: any) {
    console.error('[training/GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
