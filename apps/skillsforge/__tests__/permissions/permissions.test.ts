import { describe, it, expect } from "vitest";
import { canEditSkillGrid, isOrgAdmin } from "@/lib/api/skillsforgePermissions";
import { ROLES } from "@quikit/shared";

describe("Permissions Matrix (Section 6 & 12)", () => {
  it("allows super_admin, org_admin, and app_admin to edit the skill grid", () => {
    expect(canEditSkillGrid(ROLES.SUPER_ADMIN)).toBe(true);
    expect(canEditSkillGrid(ROLES.ORG_ADMIN)).toBe(true);
    expect(canEditSkillGrid(ROLES.ADMIN)).toBe(true);
    expect(canEditSkillGrid(ROLES.APP_ADMIN)).toBe(true);
  });

  it("denies manager, member, employee, and coach from editing the skill grid", () => {
    expect(canEditSkillGrid(ROLES.MANAGER)).toBe(false);
    expect(canEditSkillGrid(ROLES.MEMBER)).toBe(false);
    expect(canEditSkillGrid(ROLES.EMPLOYEE)).toBe(false);
    expect(canEditSkillGrid(ROLES.COACH)).toBe(false);
    expect(canEditSkillGrid("unknown_role")).toBe(false);
    expect(canEditSkillGrid(null)).toBe(false);
    expect(canEditSkillGrid(undefined)).toBe(false);
  });

  it("allows only super_admin, org_admin, and admin for administrative management", () => {
    expect(isOrgAdmin(ROLES.SUPER_ADMIN)).toBe(true);
    expect(isOrgAdmin(ROLES.ORG_ADMIN)).toBe(true);
    expect(isOrgAdmin(ROLES.ADMIN)).toBe(true);
    expect(isOrgAdmin(ROLES.APP_ADMIN)).toBe(false);
    expect(isOrgAdmin(ROLES.MEMBER)).toBe(false);
    expect(isOrgAdmin(null)).toBe(false);
    expect(isOrgAdmin(undefined)).toBe(false);
  });
});
