import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { integrationProviders } from "../src/lib/integration-framework.ts";
import {
  applyProviderPayload,
  conflictSeverity,
  createPipelineState,
  detectEventConflicts,
  integrationHealth,
  matchEvents,
  normalizeEvent,
  normalizeParticipant,
  normalizeTeam,
  normalizeVenue,
  resolveProviderField,
  resolveSafeProviderLink,
  sanitizeProviderMetadata,
  SOURCE_PRECEDENCE,
  stableSourceHash,
  type NormalizedEvent,
} from "../src/lib/provider-normalization.ts";
import { cleanSportsEngineEvent, family2_0BProviderFixtures, normalizedEntityFixtures } from "./fixtures/provider-normalization-2-0b.ts";

const sportsEngineEvent: NormalizedEvent = cleanSportsEngineEvent;

function payload(idempotencyKey: string, event = sportsEngineEvent) {
  return { provider: "sportsengine" as const, integrationId: "integration-se-crossroads", organizationId: "org-crossroads", idempotencyKey, events: [event] };
}

describe("Family 2.0B canonical provider registry", () => {
  it("declares modes, capability truth, and disabled partner scaffolds", () => {
    const byKey = new Map(integrationProviders.map((provider) => [provider.key, provider]));
    assert.equal(byKey.get("sportsengine")?.integrationMode, "API_SYNC");
    assert.equal(byKey.get("sportsengine")?.apiSupportState, "CREDENTIALS_REQUIRED");
    assert.equal(byKey.get("gamechanger")?.integrationMode, "LINK_OUT");
    assert.equal(byKey.get("gamechanger")?.capabilities.live_data, false);
    assert.equal(byKey.get("teamsnap")?.enabled, false);
    assert.equal(byKey.get("leagueapps")?.enabled, false);
    assert.equal(byKey.get("playmetrics")?.enabled, false);
    assert.equal(byKey.get("csv")?.integrationMode, "FILE_IMPORT");
    assert.equal(byKey.get("gameday_native")?.integrationMode, "NATIVE");
  });
});

describe("Family 2.0B normalization and minimum data", () => {
  it("normalizes an event and strips sensitive registration data", () => {
    const normalized = normalizeEvent("sportsengine", sportsEngineEvent);
    assert.equal(normalized.externalUrl, sportsEngineEvent.externalUrl);
    assert.deepEqual(normalized.metadata, { division: "10U" });
  });

  it("rejects malicious external IDs and unsafe links", () => {
    assert.throws(() => normalizeEvent("sportsengine", { ...sportsEngineEvent, externalId: "../../tenant-b" }), /invalid/);
    assert.equal(resolveSafeProviderLink("sportsengine", "javascript:alert(1)"), undefined);
    assert.equal(resolveSafeProviderLink("sportsengine", "https://evil.example/redirect"), undefined);
    assert.equal(resolveSafeProviderLink("sportsengine", "https://user.sportngin.com/account"), "https://user.sportngin.com/account");
  });

  it("sanitizes nested provider metadata", () => {
    assert.deepEqual(sanitizeProviderMetadata({ team: "Celtics", nested: { billing_history: [1], safe: true }, token: "secret" }), { team: "Celtics", nested: { safe: true } });
  });

  it("normalizes team, participant, and venue payloads with minimum data", () => {
    const team = normalizeTeam("sportsengine", normalizedEntityFixtures.team);
    const participant = normalizeParticipant("sportsengine", normalizedEntityFixtures.participant);
    const venue = normalizeVenue("sportsengine", normalizedEntityFixtures.venue);
    assert.equal(team.name, "Illinois Celtics 10U");
    assert.deepEqual(team.metadata, { division: "10U" });
    assert.equal(participant.displayName, "Sample Player");
    assert.deepEqual(participant.metadata, { jersey: 42 });
    assert.equal(venue.name, "Crossroads Sports Complex");
    assert.deepEqual(venue.metadata, { field_count: 8 });
  });
});

describe("Family 2.0B lineage, idempotency, and change detection", () => {
  it("creates one durable link and replays without duplicates", () => {
    const state = createPipelineState();
    const first = applyProviderPayload(state, payload("sync-1"));
    const replay = applyProviderPayload(state, payload("sync-1"));
    assert.deepEqual(first, { replay: false, created: 1, updated: 0, unchanged: 0, conflicts: 0, changes: 0 });
    assert.equal(replay.replay, true);
    assert.equal(state.links.size, 1);
    assert.equal(state.events.size, 1);
    assert.equal(state.changes.length, 0);
  });

  it("treats same content under a retry key as unchanged", () => {
    const state = createPipelineState();
    applyProviderPayload(state, payload("sync-1"));
    const retry = applyProviderPayload(state, payload("sync-retry"));
    assert.equal(retry.unchanged, 1);
    assert.equal(state.links.size, 1);
  });

  it("emits one canonical change for a provider time/field update", () => {
    const state = createPipelineState();
    applyProviderPayload(state, payload("sync-1"));
    const changed = applyProviderPayload(state, payload("sync-2", { ...sportsEngineEvent, startsAt: "2026-09-12T15:30:00.000Z", fieldName: "Field 7", sourceUpdatedAt: "2026-09-02T00:00:00.000Z" }));
    assert.equal(changed.updated, 1);
    assert.equal(changed.changes, 1);
    assert.equal(state.changes.length, 1);
    assert.ok(state.changes[0].fields.includes("startsAt"));
    assert.ok(state.changes[0].fields.includes("fieldName"));
  });
});

describe("Family 2.0B conflicts, matching, precedence, and freshness", () => {
  it("classifies and retains provider conflicts without duplication", () => {
    const incoming = { ...sportsEngineEvent, startsAt: "2026-09-12T15:30:00.000Z", fieldName: "Field 7", opponent: "Tigers" };
    const conflicts = detectEventConflicts("event-1", sportsEngineEvent, incoming, "sportsengine", "gamechanger");
    assert.equal(conflicts.find((item) => item.field === "startsAt")?.severity, "CRITICAL");
    assert.equal(conflicts.find((item) => item.field === "opponent")?.severity, "IMPORTANT");
    assert.equal(conflictSeverity("displayName"), "INFORMATIONAL");
    assert.equal(new Set(conflicts.map((item) => item.key)).size, conflicts.length);
  });

  it("auto-links only high-confidence matches and sends medium confidence to review", () => {
    const high = matchEvents(sportsEngineEvent, { ...sportsEngineEvent, externalId: "gc-abc", startsAt: "2026-09-12T15:10:00.000Z" });
    const medium = matchEvents(sportsEngineEvent, { ...sportsEngineEvent, externalId: "gc-def", startsAt: "2026-09-12T15:50:00.000Z", venueExternalId: undefined, fieldName: "Field 9" });
    const low = matchEvents(sportsEngineEvent, { ...sportsEngineEvent, externalId: "gc-xyz", startsAt: "2026-09-14T15:00:00.000Z", teamExternalId: "other-team", opponent: "Sharks", venueExternalId: "other-venue", fieldName: "Field 1" });
    assert.equal(high.confidence, "HIGH"); assert.equal(high.autoLink, true);
    assert.equal(medium.confidence, "MEDIUM"); assert.equal(medium.autoLink, false);
    assert.equal(low.confidence, "LOW"); assert.equal(low.autoLink, false);
  });

  it("preserves an active GameDay override and lets an expired override yield", () => {
    const active = resolveProviderField({ providerValue: "Field 4", currentValue: "Field 7", providerAuthority: "organization_authoritative_provider", currentAuthority: "gameday_venue_operations", override: { field: "fieldName", value: "Field 7", effectiveAt: "2026-09-01T00:00:00.000Z", expiresAt: "2026-09-03T00:00:00.000Z", reason: "Field closed", authority: "venue_director" }, now: "2026-09-02T00:00:00.000Z" });
    const expired = resolveProviderField({ providerValue: "Field 4", currentValue: "Field 7", providerAuthority: "organization_authoritative_provider", currentAuthority: "manual_fallback", override: { field: "fieldName", value: "Field 7", effectiveAt: "2026-09-01T00:00:00.000Z", expiresAt: "2026-09-02T00:00:00.000Z", reason: "Temporary", authority: "venue_director" }, now: "2026-09-03T00:00:00.000Z" });
    assert.equal(active.value, "Field 7"); assert.equal(active.overridden, true);
    assert.equal(expired.value, "Field 4"); assert.equal(expired.overridden, false);
    assert.ok(SOURCE_PRECEDENCE.gameday_venue_operations > SOURCE_PRECEDENCE.organization_authoritative_provider);
  });

  it("uses provider-specific freshness and safe disconnect behavior", () => {
    assert.equal(integrationHealth({ provider: "sportsengine", enabled: true, connected: true, lastSuccessfulSyncAt: "2026-09-01T11:30:00.000Z", now: "2026-09-01T12:00:00.000Z" }), "HEALTHY");
    assert.equal(integrationHealth({ provider: "sportsengine", enabled: true, connected: true, lastSuccessfulSyncAt: "2026-08-29T12:00:00.000Z", now: "2026-09-01T12:00:00.000Z" }), "STALE");
    assert.equal(integrationHealth({ provider: "sportsengine", enabled: true, connected: false, lastSuccessfulSyncAt: "2026-08-29T12:00:00.000Z", now: "2026-09-01T12:00:00.000Z" }), "DISCONNECTED");
    assert.equal(integrationHealth({ provider: "teamsnap", enabled: false, connected: false }), "DISABLED");
  });

  it("covers the named stale, reconnect, and provider action fixtures", () => {
    const stale = family2_0BProviderFixtures.scenarioF_staleProvider;
    assert.equal(integrationHealth({ provider: "sportsengine", enabled: true, connected: true, ...stale }), "STALE");
    const state = createPipelineState();
    applyProviderPayload(state, payload(family2_0BProviderFixtures.scenarioH_disconnectReconnect.disconnectKey));
    applyProviderPayload(state, payload(family2_0BProviderFixtures.scenarioH_disconnectReconnect.reconnectKey));
    assert.equal(state.events.size, 1);
    assert.equal(state.links.size, 1);
    assert.equal(resolveSafeProviderLink("sportsengine", family2_0BProviderFixtures.scenarioI_safeProviderAction.registrationUrl), family2_0BProviderFixtures.scenarioI_safeProviderAction.registrationUrl);
  });

  it("produces stable source hashes independent of object key order", () => {
    assert.equal(stableSourceHash({ a: 1, b: 2 }), stableSourceHash({ b: 2, a: 1 }));
  });
});
