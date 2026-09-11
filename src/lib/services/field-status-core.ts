import type { FieldStatus } from "../types.ts";

export function buildFieldStatusAuditMetadata(previousStatus: FieldStatus, newStatus: FieldStatus) {
  return {
    old_status: previousStatus,
    new_status: newStatus,
    status: newStatus,
  };
}
