import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { persistProviderPeople } from "../src/lib/provider-normalization.ts";
import type { NormalizedProviderPersonInput } from "../src/lib/platform-identity-runtime.ts";
import { claimAccountForPerson, createIdentityState, resolvePersonAssertion, selectAuthoritativeAssertion } from "../src/lib/platform-identity.ts";

const migration = readFileSync(new URL("../supabase/migrations/20260903204221_platform_identity_1_1_runtime.sql", import.meta.url), "utf8");
const teamRuntime = readFileSync(new URL("../../gameday-team-os/lib/platform-identity-runtime.ts", import.meta.url), "utf8");

const ORG = "11111111-1111-4111-8111-111111111111";
const person = (overrides: Partial<NormalizedProviderPersonInput> = {}): NormalizedProviderPersonInput => ({
  provider: "sportsengine",
  providerConnectionKey: "connection-a",
  externalPersonId: "person-1",
  organizationId: ORG,
  displayName: "Synthetic Person",
  identifiers: [],
  ...overrides,
});

describe("Platform Identity 1.1 runtime", () => {
  it("routes normalized people through one persistent resolver without adapter matching", async () => {
    const calls: NormalizedProviderPersonInput[] = [];
    const result = await persistProviderPeople({ provider: "sportsengine", integrationId: "connection-a", organizationId: ORG, people: [person()] }, {
      async resolvePerson(input) {
        calls.push(input);
        return { outcome: "DISTINCT", personId: "canonical-1", sourceIdentityId: "source-1", candidatePersonIds: [], reasonCodes: ["NEW_SOURCE_IDENTITY"], confidence: "none" };
      },
    });
    assert.equal(calls.length, 1);
    assert.equal(result[0].personId, "canonical-1");
  });

  it("rejects provider, connection, or organization scope drift before persistence", async () => {
    const runtime = { async resolvePerson() { throw new Error("must not run"); } };
    await assert.rejects(() => persistProviderPeople({ provider: "sportsengine", integrationId: "connection-a", organizationId: ORG, people: [person({ organizationId: "other" })] }, runtime), /scope/);
  });

  it("adds an explicit fail-closed state-to-organization mapping", () => {
    assert.match(migration, /create table if not exists public\.platform_organization_legacy_mappings/);
    assert.match(migration, /cardinality\(active_ids\) = 1/);
    assert.match(migration, /cardinality\(active_ids\) > 1/);
    assert.match(migration, /then 'inactive' else 'unmapped'/);
    assert.doesNotMatch(migration, /organization name|slug guessing|email domain/i);
  });

  it("keeps one atomic RPC responsible for source, identifier, provenance, relationship, review, legacy, and audit writes", () => {
    for (const table of ["person_source_identities", "person_identifiers", "person_provenance_assertions", "person_relationships", "identity_resolution_cases", "person_legacy_links", "identity_resolution_events"]) {
      assert.match(migration, new RegExp(`(?:insert into|update) public\\.${table}`));
    }
    assert.match(migration, /pg_advisory_xact_lock/);
    assert.match(migration, /SOURCE_IDENTITY_ALREADY_LINKED/);
    assert.match(migration, /on conflict \(source_identity_id\) where review_status = 'open'/);
  });

  it("enforces tenant-scoped source IDs and service-role-only function execution", () => {
    assert.match(migration, /provider_connection_key = v_connection/);
    assert.match(migration, /SOURCE_IDENTITY_ORGANIZATION_CONFLICT/);
    assert.match(migration, /revoke all on function public\.resolve_platform_person\(jsonb\) from public, anon, authenticated/);
    assert.match(migration, /grant execute on function public\.resolve_platform_person\(jsonb\) to service_role/);
  });

  it("preserves manual authority through a provenance-based effective-value projection", () => {
    assert.match(migration, /get_platform_person_effective_value/);
    assert.match(migration, /coalesce\(org_rule\.priority, global_rule\.priority, 0\)/);
    assert.match(migration, /authorityReason/);
    assert.match(migration, /hasConflict/);
    assert.match(migration, /hasOpenReview/);
  });

  it("provides a future review service contract without browser table access", () => {
    assert.match(migration, /list_platform_identity_review_cases/);
    assert.match(migration, /'candidatePersonIds'/);
    assert.match(migration, /'keepSeparate'/);
    assert.match(migration, /revoke all on function public\.list_platform_identity_review_cases\(uuid\) from public, anon, authenticated/);
  });

  it("wires the Team provider import through explicit organization resolution", () => {
    assert.match(teamRuntime, /resolve_platform_organization_mapping/);
    assert.match(teamRuntime, /resolve_platform_person/);
    assert.match(teamRuntime, /mapping\.status !== "resolved"/);
  });

  it("keeps the same provider source ID distinct across provider tenants", () => {
    const state = createIdentityState();
    const first = resolvePersonAssertion(state, { provider: "leagueapps", providerConnectionKey: "tenant-a", organizationId: ORG, externalPersonId: "member-1", displayName: "One", identifiers: [] });
    const second = resolvePersonAssertion(state, { provider: "leagueapps", providerConnectionKey: "tenant-b", organizationId: ORG, externalPersonId: "member-1", displayName: "Two", identifiers: [] });
    assert.notEqual(first.sourceIdentityKey, second.sourceIdentityKey);
    assert.notEqual(first.personId, second.personId);
  });

  it("does not collapse siblings through a shared guardian contact", () => {
    const state = createIdentityState();
    const childA = resolvePersonAssertion(state, { provider: "csv", providerConnectionKey: "family-import", organizationId: ORG, externalPersonId: "child-a", displayName: "Emma Alvarez", identifiers: [] });
    const childB = resolvePersonAssertion(state, { provider: "csv", providerConnectionKey: "family-import", organizationId: ORG, externalPersonId: "child-b", displayName: "Ava Alvarez", identifiers: [] });
    const guardian = resolvePersonAssertion(state, { provider: "csv", providerConnectionKey: "family-import", organizationId: ORG, externalPersonId: "guardian-a", displayName: "Maria Alvarez", identifiers: [{ type: "email", value: "maria@example.test", verificationStatus: "unverified" }], relationships: [
      { relationshipType: "guardian_of", relatedEntityType: "person", relatedEntityId: childA.personId!, relatedPersonId: childA.personId },
      { relationshipType: "guardian_of", relatedEntityType: "person", relatedEntityId: childB.personId!, relatedPersonId: childB.personId },
    ] });
    assert.equal(new Set([childA.personId, childB.personId, guardian.personId]).size, 3);
  });

  it("account claims fail closed for zero, multiple, and wrong-organization matches", () => {
    const state = createIdentityState();
    const verified = [{ type: "email" as const, value: "shared@example.test", verificationStatus: "provider_verified" as const }];
    const zero = claimAccountForPerson(state, { authUserId: "00000000-0000-4000-8000-000000000001", organizationId: ORG, verifiedIdentifiers: [{ ...verified[0], verificationStatus: "gameday_verified" }], actorId: "actor" });
    assert.equal(zero.outcome, "POSSIBLE_MATCH");
    resolvePersonAssertion(state, { provider: "sportsengine", providerConnectionKey: "a", organizationId: ORG, externalPersonId: "a", displayName: "A", identifiers: verified });
    resolvePersonAssertion(state, { provider: "sportsengine", providerConnectionKey: "b", organizationId: ORG, externalPersonId: "b", displayName: "B", identifiers: [] });
    // A second verified source is explicitly retained on a distinct canonical
    // person to model historical ambiguity without adapter first-match logic.
    const secondPerson = [...state.people.values()].find((item) => item.displayName === "B")!;
    state.identifiers.push({ id: "ambiguous", personId: secondPerson.id, organizationId: ORG, type: "email", normalizedValue: "shared@example.test", displayValue: "shared@example.test", verificationStatus: "provider_verified", sourceIdentityKey: "sportsengine:b:b", firstSeenAt: "now", lastSeenAt: "now" });
    const multiple = claimAccountForPerson(state, { authUserId: "00000000-0000-4000-8000-000000000002", organizationId: ORG, verifiedIdentifiers: [{ ...verified[0], verificationStatus: "gameday_verified" }], actorId: "actor" });
    const wrongOrg = claimAccountForPerson(state, { authUserId: "00000000-0000-4000-8000-000000000003", organizationId: "22222222-2222-4222-8222-222222222222", verifiedIdentifiers: [{ ...verified[0], verificationStatus: "gameday_verified" }], actorId: "actor" });
    assert.equal(multiple.outcome, "POSSIBLE_MATCH");
    assert.equal(multiple.candidatePersonIds.length, 2);
    assert.equal(wrongOrg.personId, undefined);
  });

  it("higher user-confirmed authority wins without deleting provider provenance", () => {
    const selected = selectAuthoritativeAssertion([
      { provider: "sportsengine", value: "Provider Name" },
      { provider: "gameday_account", value: "Confirmed Name" },
    ], [
      { organizationId: ORG, factDomain: "profile", factKey: "display_name", provider: "sportsengine", priority: 10 },
      { organizationId: ORG, factDomain: "profile", factKey: "display_name", provider: "gameday_account", priority: 100 },
    ], { organizationId: ORG, factDomain: "profile", factKey: "display_name" });
    assert.equal(selected.value, "Confirmed Name");
  });
});
