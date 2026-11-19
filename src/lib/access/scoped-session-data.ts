import { getSessionContext } from "./session";
import { getScopedVenuesAndFields } from "./scoped-venue-data";
import { getSessions } from "@/lib/services/sessions";
import type { Session } from "@/lib/types";
import { sessionInScheduleScope } from "./scoped-session-scope";

export async function getScheduleSessionsInScope(): Promise<Session[]> {
  const [ctx, allSessions, scoped] = await Promise.all([
    getSessionContext(),
    getSessions(),
    getScopedVenuesAndFields(),
  ]);
  const scopedFieldIds = new Set(scoped.fields.map((field) => field.id));
  return allSessions.filter((session) => sessionInScheduleScope(ctx, session, scopedFieldIds));
}
