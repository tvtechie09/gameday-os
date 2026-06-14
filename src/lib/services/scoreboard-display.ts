import type { Field, Session, SponsorPlacement, Venue } from "@/lib/types";
import { getField } from "./fields";
import { getSessionsByFieldId, getSession } from "./sessions";
import { getSponsorPlacementsForFieldPage } from "./sponsors";
import { getVenue } from "./venues";

export type ScoreboardPayload = {
  displayMode: "active" | "next" | "session";
  field: Field | null;
  generatedAt: string;
  session: Session | null;
  sponsor: SponsorPlacement | null;
  venue: Venue | null;
};

function isActiveSession(session: Session, now: Date) {
  if (session.status === "active" || session.gameStatus === "active") {
    return true;
  }

  if (!session.endTime) {
    return false;
  }

  const timestamp = now.getTime();
  return new Date(session.startTime).getTime() <= timestamp && timestamp <= new Date(session.endTime).getTime();
}

function isUpcomingSession(session: Session, now: Date) {
  return session.status === "scheduled" && new Date(session.startTime).getTime() > now.getTime();
}

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

  const now = new Date();
  const sessions = await getSessionsByFieldId(fieldId);
  const orderedSessions = [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const activeSession = orderedSessions.find((session) => isActiveSession(session, now)) ?? null;
  const nextSession = orderedSessions.find((session) => isUpcomingSession(session, now)) ?? null;
  const session = activeSession ?? nextSession;
  const venue = await getVenue(field.venueId);
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
