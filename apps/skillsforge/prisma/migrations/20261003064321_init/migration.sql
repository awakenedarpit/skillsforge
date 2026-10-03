CREATE SCHEMA IF NOT EXISTS "app_skillsforge";

-- CreateTable
CREATE TABLE "app_skillsforge"."Org" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_skillsforge"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_skillsforge"."OrgMember" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_skillsforge"."UserAppAccess" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAppAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_skillsforge"."AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changesJson" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_skillsforge"."SfShift" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "SfShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_skillsforge"."SfOperator" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "leftOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "SfOperator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_skillsforge"."SfSkill" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHi" TEXT,
    "lineKey" TEXT NOT NULL,
    "criticality" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "SfSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_skillsforge"."SfOperatorSkill" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "issuedOn" DATE,
    "certifiedUntil" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "SfOperatorSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_skillsforge"."SfSkillHistory" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldLevel" INTEGER,
    "newLevel" INTEGER,
    "oldIssuedOn" DATE,
    "newIssuedOn" DATE,
    "oldCertifiedUntil" DATE,
    "newCertifiedUntil" DATE,
    "changedBy" TEXT NOT NULL,
    "changedByName" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "SfSkillHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_skillsforge"."SfAlert" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "certifiedUntil" DATE NOT NULL,
    "severity" TEXT NOT NULL,
    "daysRemaining" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "firstFlaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedReason" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "SfAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_skillsforge"."SfJobRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "asOfDate" DATE NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "flaggedTotal" INTEGER NOT NULL DEFAULT 0,
    "newlyFlagged" INTEGER NOT NULL DEFAULT 0,
    "resolvedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "SfJobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_skillsforge"."SfAssignment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "assignmentDate" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "reasonsJson" TEXT,
    "assignedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SfAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Org_slug_key" ON "app_skillsforge"."Org"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "app_skillsforge"."User"("email");

-- CreateIndex
CREATE INDEX "OrgMember_orgId_idx" ON "app_skillsforge"."OrgMember"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMember_orgId_userId_key" ON "app_skillsforge"."OrgMember"("orgId", "userId");

-- CreateIndex
CREATE INDEX "UserAppAccess_orgId_idx" ON "app_skillsforge"."UserAppAccess"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAppAccess_orgId_userId_appId_key" ON "app_skillsforge"."UserAppAccess"("orgId", "userId", "appId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_idx" ON "app_skillsforge"."AuditLog"("orgId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_entityType_entityId_idx" ON "app_skillsforge"."AuditLog"("orgId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "SfShift_orgId_idx" ON "app_skillsforge"."SfShift"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "SfShift_orgId_code_key" ON "app_skillsforge"."SfShift"("orgId", "code");

-- CreateIndex
CREATE INDEX "SfOperator_orgId_idx" ON "app_skillsforge"."SfOperator"("orgId");

-- CreateIndex
CREATE INDEX "SfOperator_orgId_shiftId_idx" ON "app_skillsforge"."SfOperator"("orgId", "shiftId");

-- CreateIndex
CREATE INDEX "SfOperator_orgId_isActive_idx" ON "app_skillsforge"."SfOperator"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SfOperator_orgId_employeeCode_key" ON "app_skillsforge"."SfOperator"("orgId", "employeeCode");

-- CreateIndex
CREATE INDEX "SfSkill_orgId_idx" ON "app_skillsforge"."SfSkill"("orgId");

-- CreateIndex
CREATE INDEX "SfSkill_orgId_lineKey_idx" ON "app_skillsforge"."SfSkill"("orgId", "lineKey");

-- CreateIndex
CREATE UNIQUE INDEX "SfSkill_orgId_code_key" ON "app_skillsforge"."SfSkill"("orgId", "code");

-- CreateIndex
CREATE INDEX "SfOperatorSkill_orgId_idx" ON "app_skillsforge"."SfOperatorSkill"("orgId");

-- CreateIndex
CREATE INDEX "SfOperatorSkill_orgId_skillId_idx" ON "app_skillsforge"."SfOperatorSkill"("orgId", "skillId");

-- CreateIndex
CREATE INDEX "SfOperatorSkill_orgId_certifiedUntil_idx" ON "app_skillsforge"."SfOperatorSkill"("orgId", "certifiedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "SfOperatorSkill_orgId_operatorId_skillId_key" ON "app_skillsforge"."SfOperatorSkill"("orgId", "operatorId", "skillId");

-- CreateIndex
CREATE INDEX "SfSkillHistory_orgId_idx" ON "app_skillsforge"."SfSkillHistory"("orgId");

-- CreateIndex
CREATE INDEX "SfSkillHistory_orgId_operatorId_skillId_changedAt_idx" ON "app_skillsforge"."SfSkillHistory"("orgId", "operatorId", "skillId", "changedAt");

-- CreateIndex
CREATE INDEX "SfSkillHistory_orgId_changedAt_idx" ON "app_skillsforge"."SfSkillHistory"("orgId", "changedAt");

-- CreateIndex
CREATE INDEX "SfAlert_orgId_idx" ON "app_skillsforge"."SfAlert"("orgId");

-- CreateIndex
CREATE INDEX "SfAlert_orgId_status_severity_idx" ON "app_skillsforge"."SfAlert"("orgId", "status", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "SfAlert_orgId_operatorId_skillId_certifiedUntil_key" ON "app_skillsforge"."SfAlert"("orgId", "operatorId", "skillId", "certifiedUntil");

-- CreateIndex
CREATE INDEX "SfJobRun_orgId_idx" ON "app_skillsforge"."SfJobRun"("orgId");

-- CreateIndex
CREATE INDEX "SfJobRun_orgId_jobName_startedAt_idx" ON "app_skillsforge"."SfJobRun"("orgId", "jobName", "startedAt");

-- CreateIndex
CREATE INDEX "SfAssignment_orgId_idx" ON "app_skillsforge"."SfAssignment"("orgId");

-- CreateIndex
CREATE INDEX "SfAssignment_orgId_assignmentDate_idx" ON "app_skillsforge"."SfAssignment"("orgId", "assignmentDate");

-- CreateIndex
CREATE INDEX "SfAssignment_assignmentDate_idx" ON "app_skillsforge"."SfAssignment"("assignmentDate");

-- CreateIndex
CREATE INDEX "SfAssignment_orgId_operatorId_assignmentDate_idx" ON "app_skillsforge"."SfAssignment"("orgId", "operatorId", "assignmentDate");

-- CreateIndex
CREATE INDEX "SfAssignment_orgId_skillId_assignmentDate_idx" ON "app_skillsforge"."SfAssignment"("orgId", "skillId", "assignmentDate");

-- AddForeignKey
ALTER TABLE "app_skillsforge"."OrgMember" ADD CONSTRAINT "OrgMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "app_skillsforge"."Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."OrgMember" ADD CONSTRAINT "OrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_skillsforge"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."UserAppAccess" ADD CONSTRAINT "UserAppAccess_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "app_skillsforge"."Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."UserAppAccess" ADD CONSTRAINT "UserAppAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_skillsforge"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfShift" ADD CONSTRAINT "SfShift_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "app_skillsforge"."Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfOperator" ADD CONSTRAINT "SfOperator_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "app_skillsforge"."Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfOperator" ADD CONSTRAINT "SfOperator_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "app_skillsforge"."SfShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfSkill" ADD CONSTRAINT "SfSkill_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "app_skillsforge"."Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfOperatorSkill" ADD CONSTRAINT "SfOperatorSkill_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "app_skillsforge"."Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfOperatorSkill" ADD CONSTRAINT "SfOperatorSkill_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "app_skillsforge"."SfOperator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfOperatorSkill" ADD CONSTRAINT "SfOperatorSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "app_skillsforge"."SfSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfSkillHistory" ADD CONSTRAINT "SfSkillHistory_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "app_skillsforge"."Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfAlert" ADD CONSTRAINT "SfAlert_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "app_skillsforge"."Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfAlert" ADD CONSTRAINT "SfAlert_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "app_skillsforge"."SfOperator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfAlert" ADD CONSTRAINT "SfAlert_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "app_skillsforge"."SfSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfJobRun" ADD CONSTRAINT "SfJobRun_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "app_skillsforge"."Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfAssignment" ADD CONSTRAINT "SfAssignment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "app_skillsforge"."Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfAssignment" ADD CONSTRAINT "SfAssignment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "app_skillsforge"."SfOperator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfAssignment" ADD CONSTRAINT "SfAssignment_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "app_skillsforge"."SfSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_skillsforge"."SfAssignment" ADD CONSTRAINT "SfAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "app_skillsforge"."SfShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
