import "server-only";

import { canManageSchedule, isOrgScoped, type AccessContext } from "./capabilities";
import { getScopedVenuesAndFields } from "./scoped-venue-data";
import { getSessionContext } from "./session";
import { getSessionsByIds } from "@/lib/services/sessions";

export class ScheduleAuthorizationError extends Error {
  constructor() {
    super("You do not have permission to manage this schedule.");
    this.name = "ScheduleAuthorizationError";
  }
}

export async function requireScheduleAccess(input: { fieldIds?: string[]; sessionIds?: string[] } = {}): Promise<AccessContext> {
  const ctx = await getSessionContext();
  if (!ctx || !canManageSchedule(ctx) || isOrgScoped(ctx)) throw new ScheduleAuthorizationError();

  const scoped = await getScopedVenuesAndFields();
  const fieldIds = new Set(scoped.fields.map((field) => field.id));
  if ((input.fieldIds ?? []).some((fieldId) => !fieldIds.has(fieldId))) throw new ScheduleAuthorizationError();

  const requestedSessionIds = [...new Set(input.sessionIds ?? [])];
  if (requestedSessionIds.length > 0) {
    const sessions = await getSessionsByIds(requestedSessionIds);
    if (sessions.length !== requestedSessionIds.length || sessions.some((session) => !fieldIds.has(session.fieldId))) {
      throw new ScheduleAuthorizationError();
    }
  }
  return ctx;
}
