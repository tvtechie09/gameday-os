import type { Alert, Field, Organization, Session, Sponsor, SponsorAssignment, Venue } from "@/lib/types";
import { filterAlertsForFieldPage, getActiveAlerts, sortAlertsForDisplay } from "./alerts";
import { getFields } from "./fields";
import { getOrganization } from "./organizations";
import { getSessions } from "./sessions";
import { getSponsorAssignments, getSponsors } from "./sponsors";
import { getVenue } from "./venues";

export type VenueDisplaySponsor = {
  assignment: SponsorAssignment;
  sponsor: Sponsor;
};

export type VenueDisplayField = {
  currentSession: Session | null;
  field: Field;
  nextSession: Session | null;
};

export type VenueDisplayScheduleGroup = {
  field: Field;
  sessions: Session[];
};

export type VenueDisplayPayload = {
  alerts: Alert[];
  fields: VenueDisplayField[];
  generatedAt: string;
  organization: Organization | null;
  schedule: VenueDisplayScheduleGroup[];
  sponsors: VenueDisplaySponsor[];
  venue: Venue | null;
};

function isToday(value: string, now: Date) {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

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

function getVenueSponsors({
  assignments,
  fields,
  sessions,
  sponsors,
  venueId,
}: {
  assignments: SponsorAssignment[];
  fields: Field[];
  sessions: Session[];
  sponsors: Sponsor[];
  venueId: string;
}) {
  const fieldIds = new Set(fields.map((field) => field.id));
  const sessionIds = new Set(sessions.map((session) => session.id));
  const sponsorsById = new Map(sponsors.map((sponsor) => [sponsor.id, sponsor]));
  const seenSponsorIds = new Set<string>();

  return assignments.flatMap((assignment): VenueDisplaySponsor[] => {
    const isRelevant = assignment.venueId === venueId
      || Boolean(assignment.fieldId && fieldIds.has(assignment.fieldId))
      || Boolean(assignment.sessionId && sessionIds.has(assignment.sessionId));

    if (!isRelevant || seenSponsorIds.has(assignment.sponsorId)) {
      return [];
    }

    const sponsor = sponsorsById.get(assignment.sponsorId);
    if (!sponsor) {
      return [];
    }

    seenSponsorIds.add(assignment.sponsorId);
    return [{ assignment, sponsor }];
  });
}

export async function getVenueDisplayPayload(venueId: string): Promise<VenueDisplayPayload> {
  const venue = await getVenue(venueId);

  if (!venue) {
    return {
      alerts: [],
      fields: [],
      generatedAt: new Date().toISOString(),
      organization: null,
      schedule: [],
      sponsors: [],
      venue: null,
    };
  }

  const [organization, allFields, allSessions, activeAlerts, sponsors, sponsorAssignments] = await Promise.all([
    venue.organizationId ? getOrganization(venue.organizationId) : Promise.resolve(null),
    getFields(),
    getSessions(),
    getActiveAlerts(),
    getSponsors(),
    getSponsorAssignments(),
  ]);
  const now = new Date();
  const fields = allFields
    .filter((field) => field.venueId === venueId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const fieldIds = new Set(fields.map((field) => field.id));
  const sessions = allSessions
    .filter((session) => fieldIds.has(session.fieldId))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const fieldCards = fields.map((field) => {
    const fieldSessions = sessions.filter((session) => session.fieldId === field.id);
    return {
      currentSession: fieldSessions.find((session) => isActiveSession(session, now)) ?? null,
      field,
      nextSession: fieldSessions.find((session) => isUpcomingSession(session, now)) ?? null,
    };
  });
  const alerts = sortAlertsForDisplay(activeAlerts.filter((alert) => {
    if (alert.alertVisibility !== "public" || alert.venueId !== venueId) {
      return false;
    }

    if (alert.alertScope === "venue" || alert.alertScope === "global") {
      return true;
    }

    return fields.some((field) => filterAlertsForFieldPage({
      alerts: [alert],
      fieldId: field.id,
      publicOnly: true,
      tournamentId: fieldCards.find((card) => card.field.id === field.id)?.currentSession?.tournamentId,
      venueId,
    }).length > 0);
  }));
  const todaySessions = sessions.filter((session) => isToday(session.startTime, now));

  return {
    alerts,
    fields: fieldCards,
    generatedAt: new Date().toISOString(),
    organization,
    schedule: fields.map((field) => ({
      field,
      sessions: todaySessions.filter((session) => session.fieldId === field.id),
    })).filter((group) => group.sessions.length > 0),
    sponsors: getVenueSponsors({
      assignments: sponsorAssignments,
      fields,
      sessions,
      sponsors,
      venueId,
    }),
    venue,
  };
}
