import type { Field, Session, SponsorPlacement, Venue } from "@/lib/types";
import { getField } from "./fields";
import { getSessionsByFieldId, getSession } from "./sessions";
import { getSponsorPlacementsForFieldPage } from "./sponsors";
import { getVenue } from "./venues";
import { projectFieldSessions } from "./session-projection-core";

export type ScoreboardPayload = {
  displayMode: "active" | "next" | "session";
  field: Field | null;
  generatedAt: string;
  session: Session | null;
  sponsor: SponsorPlacement | null;
  venue: Venue | null;
};

function pickSponsor(placements: SponsorPlacement[]) {
  return placements.find((placement) => placement.assignmentType === "session")
    ?? placements.find((placement) => placement.assignmentType === "field")
    ?? placements[0]
    ?? null;
}

async function getContextForSession(session: Session | null): Promise<Omit<ScoreboardPayload, "displayMode" | "generatedAt" | "session">> {
  if (!session) {
    return { field: null, sponsor: null, venue: null };
  }

  const field = await getField(session.fieldId);
  const venue = field ? await getVenue(field.venueId) : null;
  const sponsorPlacements = field
    ? await getSponsorPlacementsForFieldPage({
      fieldId: field.id,
      sessionId: session.id,
      venueId: field.venueId,
    })
    : [];

  return {
    field,
    sponsor: pickSponsor(sponsorPlacements),
    venue,
  };
}

export async function getScoreboardPayloadBySessionId(sessionId: string): Promise<ScoreboardPayload> {
  const session = await getSession(sessionId);
  const context = await getContextForSession(session);

  return {
    ...context,
    displayMode: "session",
    generatedAt: new Date().toISOString(),
    session,
  };
}

export async function getScoreboardPayloadByFieldId(fieldId: string): Promise<ScoreboardPayload> {
  const field = await getField(fieldId);

  if (!field) {
    return {
      displayMode: "active",
      field: null,
      generatedAt: new Date().toISOString(),
      session: null,
      sponsor: null,
      venue: null,
    };
  }

  const [sessions, venue] = await Promise.all([getSessionsByFieldId(fieldId), getVenue(field.venueId)]);
  const projection = projectFieldSessions({ sessions, now: Date.now(), timeZone: venue?.timezone });
  const activeSession = projection.current;
  const nextSession = projection.next;
  const session = activeSession ?? nextSession;
  const sponsorPlacements = await getSponsorPlacementsForFieldPage({
    fieldId: field.id,
    sessionId: session?.id,
    venueId: field.venueId,
  });

  return {
    displayMode: activeSession ? "active" : "next",
    field,
    generatedAt: new Date().toISOString(),
    session,
    sponsor: pickSponsor(sponsorPlacements),
    venue,
  };
}
