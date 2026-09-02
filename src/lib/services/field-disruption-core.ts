import type { Field, Session, Venue } from "../types.ts";
import type { WorkOrder } from "./work-orders.ts";
import { projectFieldSessions } from "./session-projection-core.ts";

export type FieldDisruptionReason = "closed" | "maintenance" | "delayed" | "issue" | "none";

export type FieldDisruptionReview = {
  affectedCount: number;
  inProgress: Session[];
  startingSoon: Session[];
  laterToday: Session[];
  scheduledRemainingCount: number;
  reason: FieldDisruptionReason;
  explanation: string;
  unresolvedIssues: WorkOrder[];
};

const STARTING_SOON_MS = 90 * 60_000;
const unresolved = (order: WorkOrder) => order.status !== "resolved" && order.status !== "done" && !order.closedAt;

export function buildFieldDisruptionReview(input: {
  field: Field;
  venue: Venue;
  sessions: Session[];
  workOrders: WorkOrder[];
  now: number;
}): FieldDisruptionReview {
  const projection = projectFieldSessions({
    sessions: input.sessions.filter((session) => session.fieldId === input.field.id),
    now: input.now,
    timeZone: input.venue.timezone,
  });
  const unresolvedIssues = input.workOrders.filter((order) => order.fieldId === input.field.id && unresolved(order));
  const nextToday = projection.remainingToday[0] ?? null;
  const reason: FieldDisruptionReason = input.field.status === "closed"
    ? "closed"
    : input.field.status === "maintenance"
      ? "maintenance"
      : input.field.status === "delayed"
        ? "delayed"
        : unresolvedIssues.length > 0
          ? "issue"
          : "none";

  let affected: Session[] = [];
  let explanation = "This field has no active disruption. Its remaining schedule is shown for context only.";
  if (reason === "closed" || reason === "maintenance") {
    affected = [...(projection.current ? [projection.current] : []), ...projection.remainingToday];
    explanation = reason === "closed"
      ? "The field is closed, so the current game and every remaining valid game today require review until the field reopens."
      : "The field is unavailable for maintenance, so the current game and every remaining valid game today require review until maintenance ends.";
  } else if (reason === "delayed") {
    affected = [...(projection.current ? [projection.current] : []), ...(nextToday ? [nextToday] : [])];
    explanation = "The delay has no confirmed recovery window. GameDay conservatively flags the current game and the next valid game, not the entire day.";
  } else if (reason === "issue") {
    affected = [...(projection.current ? [projection.current] : []), ...(nextToday ? [nextToday] : [])];
    explanation = "An unresolved field issue has no confirmed impact window. Review the current and next valid game before changing the schedule.";
  }

  const uniqueAffected = [...new Map(affected.map((session) => [session.id, session])).values()];
  const inProgress = projection.current && uniqueAffected.some((session) => session.id === projection.current?.id) ? [projection.current] : [];
  const future = uniqueAffected.filter((session) => session.id !== projection.current?.id);
  const startingSoon = future.filter((session) => Date.parse(session.startTime) - input.now <= STARTING_SOON_MS);
  const laterToday = future.filter((session) => Date.parse(session.startTime) - input.now > STARTING_SOON_MS);

  return {
    affectedCount: uniqueAffected.length,
    inProgress,
    startingSoon,
    laterToday,
    scheduledRemainingCount: projection.remainingToday.length,
    reason,
    explanation,
    unresolvedIssues,
  };
}
