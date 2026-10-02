import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orgId = 'demo-org-id';

  await prisma.auditLog.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.jobRun.deleteMany();
  await prisma.skillHistory.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.operatorSkill.deleteMany();
  await prisma.operator.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.user.deleteMany();

  console.log('Database cleared.');

  // Create Shifts
  const shiftA = await prisma.shift.create({
    data: { id: 'shift-a', orgId, name: 'Shift A', startTime: '06:00', endTime: '14:00' },
  });
  const shiftB = await prisma.shift.create({
    data: { id: 'shift-b', orgId, name: 'Shift B', startTime: '14:00', endTime: '22:00' },
  });

  // Create Skills
  const s1 = await prisma.skill.create({
    data: { id: 'skill-1', orgId, code: 'WLD-01', name: 'Welding', line: 'Body', criticality: 3 },
  });
  const s2 = await prisma.skill.create({
    data: { id: 'skill-2', orgId, code: 'ASS-01', name: 'Assembly', line: 'Trim', criticality: 2 },
  });
  const s3 = await prisma.skill.create({
    data: { id: 'skill-3', orgId, code: 'CHK-01', name: 'Quality Check', line: 'Final', criticality: 3 },
  });

  // Create Operators
  const op1 = await prisma.operator.create({
    data: { id: 'op-1', orgId, employeeCode: 'EMP-001', name: 'Alice Smith', shiftId: shiftA.id },
  });
  const op2 = await prisma.operator.create({
    data: { id: 'op-2', orgId, employeeCode: 'EMP-002', name: 'Bob Johnson', shiftId: shiftA.id },
  });
  const op3 = await prisma.operator.create({
    data: { id: 'op-3', orgId, employeeCode: 'EMP-003', name: 'Charlie Davis', shiftId: shiftB.id },
  });
  const op4 = await prisma.operator.create({
    data: { id: 'op-4', orgId, employeeCode: 'EMP-004', name: 'Diana Evans', shiftId: shiftB.id },
  });

  // Operator Skills
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextYear = new Date(now);
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  await prisma.operatorSkill.create({
    data: { orgId, operatorId: op1.id, skillId: s1.id, level: 4, certifiedUntil: nextYear },
  });
  await prisma.operatorSkill.create({
    data: { orgId, operatorId: op1.id, skillId: s2.id, level: 2, certifiedUntil: nextYear },
  });

  await prisma.operatorSkill.create({
    data: { orgId, operatorId: op2.id, skillId: s1.id, level: 2, certifiedUntil: nextMonth },
  });

  await prisma.operatorSkill.create({
    data: { orgId, operatorId: op3.id, skillId: s3.id, level: 4, certifiedUntil: nextYear },
  });
  await prisma.operatorSkill.create({
    data: { orgId, operatorId: op4.id, skillId: s2.id, level: 3, certifiedUntil: nextYear },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
