import type { FieldOverride, NormalizedEvent, NormalizedParticipant, NormalizedTeam, NormalizedVenue } from "../../src/lib/provider-normalization.ts";

export const cleanSportsEngineEvent: NormalizedEvent = {
  externalId: "se-event-123",
  eventType: "GAME",
  startsAt: "2026-09-12T15:00:00.000Z",
  arrivalAt: "2026-09-12T14:15:00.000Z",
  teamExternalId: "se-team-celtics-10u",
  opponent: "Tigers 10U",
  venueExternalId: "se-crossroads",
  venueName: "Crossroads Sports Complex",
  fieldName: "Field 4",
  status: "SCHEDULED",
  externalUrl: "https://www.sportsengine.com/events/se-event-123",
  sourceUpdatedAt: "2026-09-01T00:00:00.000Z",
  metadata: { division: "10U", payment_details: "must-not-persist", medical_note: "must-not-persist" },
};

export const family2_0BProviderFixtures = {
  scenarioA_cleanSportsEngineSync: cleanSportsEngineEvent,
  scenarioB_idempotentReplay: { idempotencyKey: "sportsengine-crossroads-2026-09-01-v1" },
  scenarioC_realScheduleChange: { ...cleanSportsEngineEvent, startsAt: "2026-09-12T15:30:00.000Z", fieldName: "Field 7", sourceUpdatedAt: "2026-09-02T00:00:00.000Z" },
  scenarioD_gameChangerConflict: { ...cleanSportsEngineEvent, externalId: "gc-game-abc", startsAt: "2026-09-12T15:30:00.000Z", fieldName: "Field 7", externalUrl: "https://gc.com/game/gc-game-abc" },
  scenarioE_duplicateCandidate: { ...cleanSportsEngineEvent, externalId: "gc-game-same", startsAt: "2026-09-12T15:10:00.000Z" },
  scenarioF_staleProvider: { lastSuccessfulSyncAt: "2026-08-29T12:00:00.000Z", now: "2026-09-01T12:00:00.000Z" },
  scenarioG_manualOverride: { field: "fieldName", value: "Field 7", effectiveAt: "2026-09-01T00:00:00.000Z", expiresAt: "2026-09-03T00:00:00.000Z", reason: "Field closed", authority: "venue_director" } satisfies FieldOverride,
  scenarioH_disconnectReconnect: { disconnectKey: "sportsengine-disconnect", reconnectKey: "sportsengine-reconnect" },
  scenarioI_safeProviderAction: { label: "Open in SportsEngine", registrationUrl: "https://user.sportngin.com/register/form/fixture" },
} as const;

export const normalizedEntityFixtures: { team: NormalizedTeam; participant: NormalizedParticipant; venue: NormalizedVenue } = {
  team: { externalId: "se-team-celtics-10u", name: " Illinois Celtics 10U ", season: " Fall 2026 ", organization: "Celtics Baseball", activity: "Baseball", metadata: { division: "10U", billing_history: [1, 2] } },
  participant: { externalId: "se-player-42", teamExternalId: "se-team-celtics-10u", displayName: " Sample Player ", role: " athlete ", metadata: { jersey: 42, medical_note: "never persist", parent_email: "not requested" } },
  venue: { externalId: "se-crossroads", providerVenueKey: "crossroads-main", name: " Crossroads Sports Complex ", address: " 1000 Fictional Way, New Lenox, IL ", metadata: { field_count: 8, payment_token: "never persist" } },
};
