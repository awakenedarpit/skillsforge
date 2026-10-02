import { db } from "../db";

export interface AuditLogInput {
  orgId: string;
  actorId?: string | null;
  actorRole?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE";
  entityType: string;
  entityId: string;
  changes?: string[]; // field names only, no personal data / values
  reason?: string | null;
}

/**
 * Writes an audit entry to the platform AuditLog table.
 * Per platform rule 7: A failed audit write must never block the mutation.
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        orgId: input.orgId,
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        changesJson: input.changes ? JSON.stringify(input.changes) : null,
        reason: input.reason ?? null,
      },
    });
  } catch (err: unknown) {
    console.error("Failed to write audit log:", err);
  }
}
