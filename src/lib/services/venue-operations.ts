import { getVenues } from "@/lib/services/venues";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { venueInScope, type AccessContext } from "@/lib/access/capabilities";
import type { Field, Session, Venue } from "@/lib/types";

// Resolves the venue the acting user operates, then the concrete targets the
// Today's-Operations quick actions act on: the next game to start, the current
// game to delay, and the venue's fields to open/close. A venue-scoped user gets
// their own venue; a platform/org admin gets the busiest venue by field count.

export type QuickActionTargets = {
  venueId: string | null;
  venueName: string | null;
  startGame: { sessionId: string; label: string; startTime: string; fieldName: string } | null;
  delayGame: { sessionId: string; fieldId: string; label: string; fieldName: string } | null;
  fields: Array<{ id: string; name: string; status: string }>;
};

function labelFor(session: Session): string {
  return session.title || session.homeTeam + " vs " + session.awayTeam;
}

export async function resolveActingVenue(ctx: AccessContext | null): Promise<Venue | null> {
  const [venues, fields] = await Promise.all([getVenues().catch(() => []), getFields().catch(() => [])]);
  if (!venues.length) return null;
  if (ctx && ctx.scopeType === "venue") {
    return venues.find((venue) => venueInScope(ctx, venue)) ?? null;
  }
  const fieldCount = new Map<string, number>();
  for (const field of fields) fieldCount.set(field.venueId, (fieldCount.get(field.venueId) ?? 0) + 1);
  return [...venues].sort((a, b) => (fieldCount.get(b.id) ?? 0) - (fieldCount.get(a.id) ?? 0))[0] ?? null;
}

export async function resolveQuickActionTargets(ctx: AccessContext | null): Promise<QuickActionTargets> {
  const venue = await resolveActingVenue(ctx);
  if (!venue) {
    return { venueId: null, venueName: null, startGame: null, delayGame: null, fields: [] };
  }
  const [allFields, allSessions] = await Promise.all([getFields().catch(() => []), getSessions().catch(() => [])]);
  const venueFields: Field[] = allFields.filter((field) => field.venueId === venue.id);
  const fieldIds = new Set(venueFields.map((field) => field.id));
  const fieldName = new Map(venueFields.map((field) => [field.id, field.name]));
  const now = Date.now();

  const venueSessions = allSessions
    .filter((session) => fieldIds.has(session.fieldId))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Next game to start: soonest scheduled game within a sensible window
  // (from 2h ago to 12h out), so a running-late game is still startable.
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
