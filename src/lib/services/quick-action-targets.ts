import type { Field, Session, Venue } from "@/lib/types";

// Pure resolution of Today's-Operations quick-action targets. Kept dependency-
// free (type-only imports) so the game-selection rules are unit-testable
// without the DB-backed venue-operations service. `now` is injected for
// deterministic tests. `venueSessions` is expected sorted by start time.

export type QuickActionTargets = {
  venueId: string | null;
  venueName: string | null;
  startGame: { sessionId: string; label: string; startTime: string; fieldName: string } | null;
  delayGame: { sessionId: string; fieldId: string; label: string; fieldName: string } | null;
  fields: Array<{ id: string; name: string; status: string }>;
};

export function labelFor(session: Pick<Session, "title" | "homeTeam" | "awayTeam">): string {
  return session.title || session.homeTeam + " vs " + session.awayTeam;
}

export function computeQuickActionTargets(venue: Venue, venueFields: Field[], venueSessions: Session[], now: number): QuickActionTargets {
  const fieldName = new Map(venueFields.map((field) => [field.id, field.name]));
  // Next game to start: soonest scheduled game in a -2h..+12h window (so a
  // running-late game is still startable, tomorrow's isn't).
  const startable = venueSessions.find((session) =>
    session.status === "scheduled"
    && new Date(session.startTime).getTime() > now - 2 * 60 * 60 * 1000
    && new Date(session.startTime).getTime() < now + 12 * 60 * 60 * 1000);
  // Game to delay: the live one if any, else the next startable.
  const live = venueSessions.find((session) => session.status === "active");
  const delayTarget = live ?? startable ?? null;
  return {
    venueId: venue.id,
    venueName: venue.name,
    startGame: startable
      ? { sessionId: startable.id, label: labelFor(startable), startTime: startable.startTime, fieldName: fieldName.get(startable.fieldId) || "Field" }
      : null,
    delayGame: delayTarget
      ? { sessionId: delayTarget.id, fieldId: delayTarget.fieldId, label: labelFor(delayTarget), fieldName: fieldName.get(delayTarget.fieldId) || "Field" }
      : null,
    fields: venueFields.map((field) => ({ id: field.id, name: field.name, status: field.status })),
  };
}
