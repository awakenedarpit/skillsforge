import { NextResponse } from 'next/server';
import { forecast } from '@quikit/shared';

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
  { id: 'shift-a', name: 'Shift A' },
  { id: 'shift-b', name: 'Shift B' },
  { id: 'shift-c', name: 'Shift C' },
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
    const daysStr = url.searchParams.get('daysAhead');
    
    const onDate = dateStr ? new Date(dateStr) : new Date();
    const daysAhead = daysStr ? parseInt(daysStr, 10) : 30;

    const coverage = forecast(MOCK_OPERATORS, MOCK_SKILLS, MOCK_SHIFTS, MOCK_RECORDS, onDate, daysAhead);

    return NextResponse.json({ coverage, onDate, daysAhead, meta: { skills: MOCK_SKILLS, shifts: MOCK_SHIFTS } });
  } catch (error: any) {
    console.error('[forecast/GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
