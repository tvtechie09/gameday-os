import type { Session, SessionSportType } from "@/lib/types";

export type ScheduleImportCandidate = {
  externalSource: string;
  externalSourceId: string;
  externalSourceUrl: string | null;
  fieldId: string;
  title: string;
  sportType: SessionSportType;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  endTime: string | null;
  notes: string | null;
};

export type ScheduleImportDecision =
  | { action: "create"; existingSessionId: null; changedFields: [] }
  | { action: "update"; existingSessionId: string; changedFields: string[] }
  | { action: "unchanged"; existingSessionId: string; changedFields: [] }
  | { action: "conflict"; existingSessionId: null; changedFields: []; reason: string };

export type CanonicalOperationalEvent = {
  eventId: string;
  organizationId: string | null;
  fieldId: string;
  playSurfaceId: string | null;
  tournamentId: string | null;
  title: string;
  sportType: SessionSportType;
  homeTeam: string;
  awayTeam: string;
  startsAt: string;
  endsAt: string | null;
  lifecycleStatus: Session["lifecycleStatus"];
  source: {
    provider: string | null;
    externalId: string | null;
    externalUrl: string | null;
    updatedAt: string;
  };
  teamLinks: {
    teamSeasonId: string | null;
    homeTeamSeasonId: string | null;
    awayTeamSeasonId: string | null;
    syncStatus: Session["gameDayTeamSyncStatus"];
    lastSyncedAt: string | null;
  };
};

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function canonicalExternalEventKey(provider: string, externalId: string) {
  return `${provider.trim().toLowerCase()}|${externalId.trim()}`;
}

export function classifyScheduleImport(
  candidate: ScheduleImportCandidate,
  sessions: Array<Pick<Session, "id" | "externalSource" | "externalSourceId" | "externalSourceUrl" | "fieldId" | "title" | "sportType" | "homeTeam" | "awayTeam" | "startTime" | "endTime" | "notes">>,
): ScheduleImportDecision {
  const provider = candidate.externalSource.trim().toLowerCase();
  const providerSessions = sessions.filter((session) => {
    if (session.externalSource?.trim().toLowerCase() !== provider) return false;
    return true;
  });
  const matches = providerSessions.filter((session) => session.externalSourceId === candidate.externalSourceId);
  const urlMatches = candidate.externalSourceUrl
    ? providerSessions.filter((session) => session.externalSourceUrl === candidate.externalSourceUrl)
    : [];

  if (matches.length === 0) {
    if (urlMatches.length > 0) {
      return {
        action: "conflict",
        existingSessionId: null,
        changedFields: [],
        reason: "This source URL already belongs to a different external event ID.",
      };
    }
    return { action: "create", existingSessionId: null, changedFields: [] };
  }
  if (matches.length > 1) {
    return {
      action: "conflict",
      existingSessionId: null,
      changedFields: [],
      reason: "More than one GameDay event matches this external identity.",
    };
  }

  const session = matches[0];
  const comparisons: Array<[string, string, string]> = [
    ["field", session.fieldId, candidate.fieldId],
    ["title", normalizeText(session.title), normalizeText(candidate.title)],
    ["sport", session.sportType, candidate.sportType],
    ["home team", normalizeText(session.homeTeam), normalizeText(candidate.homeTeam)],
    ["away team", normalizeText(session.awayTeam), normalizeText(candidate.awayTeam)],
    ["start time", normalizeDate(session.startTime), normalizeDate(candidate.startTime)],
    ["end time", normalizeDate(session.endTime), normalizeDate(candidate.endTime)],
    ["notes", normalizeText(session.notes), normalizeText(candidate.notes)],
  ];
  const changedFields = comparisons.filter(([, current, next]) => current !== next).map(([label]) => label);

  return changedFields.length > 0
    ? { action: "update", existingSessionId: session.id, changedFields }
    : { action: "unchanged", existingSessionId: session.id, changedFields: [] };
}

export function toCanonicalOperationalEvent(session: Session): CanonicalOperationalEvent {
  return {
    eventId: session.id,
    organizationId: session.organizationId ?? null,
    fieldId: session.fieldId,
    playSurfaceId: session.playSurfaceId,
    tournamentId: session.tournamentId,
    title: session.title,
    sportType: session.sportType,
    homeTeam: session.homeTeam,
    awayTeam: session.awayTeam,
    startsAt: session.startTime,
    endsAt: session.endTime,
    lifecycleStatus: session.lifecycleStatus,
    source: {
      provider: session.externalSource,
      externalId: session.externalSourceId,
      externalUrl: session.externalSourceUrl,
      updatedAt: session.updatedAt,
    },
    teamLinks: {
      teamSeasonId: session.gameDayTeamSeasonId,
      homeTeamSeasonId: session.gameDayHomeTeamSeasonId,
      awayTeamSeasonId: session.gameDayAwayTeamSeasonId,
      syncStatus: session.gameDayTeamSyncStatus,
      lastSyncedAt: session.gameDayTeamLastSyncedAt,
    },
  };
}
