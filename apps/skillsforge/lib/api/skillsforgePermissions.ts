import { ROLE_HIERARCHY, ROLES } from "@quikit/shared";

/**
 * Determines whether a user with the given role can edit the skill grid,
 * create/update assignments, or run the expiry job.
 * Rank >= app_admin (app_admin, org_admin, super_admin).
 */
export function canEditSkillGrid(role: string | null | undefined): boolean {
  if (!role) return false;
  const rank = ROLE_HIERARCHY[role] ?? 0;
  const appAdminRank = ROLE_HIERARCHY[ROLES.APP_ADMIN] ?? 4;
  return rank >= appAdminRank;
}

/**
 * Determines whether a user is an admin (org_admin or super_admin).
 * Used for administrative actions like operator/machine CRUD, demo reset.
 */
export function isOrgAdmin(role: string | null | undefined): boolean {
  if (!role) return false;
  const rank = ROLE_HIERARCHY[role] ?? 0;
  const orgAdminRank = ROLE_HIERARCHY[ROLES.ORG_ADMIN] ?? 5;
  return rank >= orgAdminRank;
}
