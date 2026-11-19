import { canManageSchedule, managesAllVenues, type AccessContext } from "./capabilities.ts";
import type { Session } from "../types.ts";

export function sessionInScheduleScope(
  ctx: AccessContext | null,
  session: Pick<Session, "fieldId" | "tournamentId">,
  scopedFieldIds: ReadonlySet<string>,
): boolean {
  if (!canManageSchedule(ctx)) return false;
  if (managesAllVenues(ctx)) return true;
  if (ctx?.scopeType === "tournament") {
    return Boolean(ctx.scopeId) && session.tournamentId === ctx.scopeId;
  }
  return scopedFieldIds.has(session.fieldId);
}
