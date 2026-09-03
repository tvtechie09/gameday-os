import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canReviewIdentity,
  claimAccountForPerson,
  confirmIdentityMatch,
  createIdentityState,
  keepIdentitySeparate,
  normalizeEmail,
  normalizePhone,
  resolvePersonAssertion,
  selectAuthoritativeAssertion,
  sourceIdentityKey,
  unlinkSourceIdentity,
  type IdentityState,
  type NormalizedPersonAssertion,
} from "../src/lib/platform-identity.ts";
import { applyProviderPayload, createPipelineState } from "../src/lib/provider-normalization.ts";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";

function incoming(overrides: Partial<NormalizedPersonAssertion> = {}): NormalizedPersonAssertion {
  return {
    provider: "sportsengine",
    providerConnectionKey: "sportsengine-org-a",
    organizationId: ORG_A,
    externalPersonId: "se-kyle",
    displayName: "Kyle McGraw",
    identifiers: [{ type: "email", value: "Kyle@Example.com", verificationStatus: "provider_verified" }],
    ...overrides,
  };
}

function personCount(state: IdentityState) {
  return state.people.size;
}

describe("GameDay Platform Identity 1.0", () => {
  it("normalizes email and North American phone identifiers without using them as primary keys", () => {
    assert.equal(normalizeEmail("  Kyle@Example.COM "), "kyle@example.com");
    assert.equal(normalizePhone("+1 (815) 555-0123"), "8155550123");
    assert.equal(normalizePhone("815.555.0123"), "8155550123");
  });

  it("Scenario A: links two provider identities to one person on a unique verified email", () => {
    const state = createIdentityState();
    const first = resolvePersonAssertion(state, incoming());
    const second = resolvePersonAssertion(state, incoming({ provider: "gamechanger", providerConnectionKey: "gc-org-a", externalPersonId: "gc-kyle" }));

    assert.equal(first.outcome, "DISTINCT");
    assert.equal(second.outcome, "LINKED");
    assert.equal(second.personId, first.personId);
    assert.deepEqual(second.reasonCodes, ["VERIFIED_EMAIL_EXACT_MATCH"]);
    assert.equal(personCount(state), 1);
    assert.equal(state.sourceIdentities.size, 2);
  });

  it("Scenario B: links different provider emails on one unique verified phone", () => {
    const state = createIdentityState();
    const first = resolvePersonAssertion(state, incoming({ identifiers: [
      { type: "email", value: "kyle@work.example", verificationStatus: "provider_verified" },
      { type: "phone", value: "+1 815 555 0123", verificationStatus: "provider_verified" },
    ] }));
    const second = resolvePersonAssertion(state, incoming({ provider: "teamsnap", providerConnectionKey: "ts-org-a", externalPersonId: "ts-kyle", identifiers: [
      { type: "email", value: "kmcgraw@home.example", verificationStatus: "provider_verified" },
      { type: "phone", value: "815-555-0123", verificationStatus: "provider_verified" },
    ] }));

    assert.equal(second.outcome, "LINKED");
    assert.equal(second.personId, first.personId);
    assert.deepEqual(second.reasonCodes, ["VERIFIED_PHONE_EXACT_MATCH"]);
  });

  it("Scenario C: never auto-links on name alone", () => {
    const state = createIdentityState();
    const first = resolvePersonAssertion(state, incoming({ identifiers: [] }));
    const second = resolvePersonAssertion(state, incoming({ provider: "csv", providerConnectionKey: "roster-2026", externalPersonId: "row-19", identifiers: [] }));

    assert.equal(first.outcome, "DISTINCT");
    assert.equal(second.outcome, "DISTINCT");
    assert.notEqual(first.personId, second.personId);
    assert.equal(personCount(state), 2);
    assert.ok(second.reasonCodes.includes("NAME_ONLY_INSUFFICIENT"));
  });

  it("Scenario D: guardian context without a strong identifier is a possible match", () => {
    const state = createIdentityState();
    const child = resolvePersonAssertion(state, incoming({ externalPersonId: "se-charlie", displayName: "Charlie McGraw", identifiers: [] }));
    const guardian = resolvePersonAssertion(state, incoming({ identifiers: [], relationships: [{ relationshipType: "guardian_of", relatedEntityType: "person", relatedEntityId: child.personId!, relatedPersonId: child.personId }] }));
    const candidate = resolvePersonAssertion(state, incoming({ provider: "gamechanger", providerConnectionKey: "gc-org-a", externalPersonId: "gc-kyle", identifiers: [], relationships: [{ relationshipType: "guardian_of", relatedEntityType: "person", relatedEntityId: child.personId!, relatedPersonId: child.personId }] }));

    assert.equal(guardian.outcome, "DISTINCT");
    assert.equal(candidate.outcome, "POSSIBLE_MATCH");
    assert.deepEqual(candidate.reasonCodes, ["SAME_GUARDIAN_AND_CHILD_CONTEXT"]);
  });

  it("Scenario E: explicit user confirmation links a possible match with an auditable reason", () => {
    const state = createIdentityState();
    const existing = resolvePersonAssertion(state, incoming({ identifiers: [], relationships: [{ relationshipType: "guardian_of", relatedEntityType: "person", relatedEntityId: "child-1", relatedPersonId: "child-1" }] }));
    const possibleInput = incoming({ provider: "gamechanger", providerConnectionKey: "gc-org-a", externalPersonId: "gc-kyle", identifiers: [], relationships: [{ relationshipType: "guardian_of", relatedEntityType: "person", relatedEntityId: "child-1", relatedPersonId: "child-1" }] });
    const possible = resolvePersonAssertion(state, possibleInput);
    const confirmed = confirmIdentityMatch(state, { organizationId: ORG_A, sourceIdentityKey: possible.sourceIdentityKey, personId: existing.personId!, actorType: "authenticated_user", actorId: "auth-kyle" });

    assert.equal(confirmed.outcome, "LINKED");
    assert.deepEqual(confirmed.reasonCodes, ["USER_CONFIRMED_MATCH"]);
    assert.equal(state.sourceIdentities.get(possible.sourceIdentityKey)?.personId, existing.personId);
    assert.equal(state.events.at(-1)?.actorType, "authenticated_user");
  });

  it("does not let a user confirmation attach an unresolved source to an unproposed person", () => {
    const state = createIdentityState();
    const proposed = resolvePersonAssertion(state, incoming({ identifiers: [], relationships: [{ relationshipType: "guardian_of", relatedEntityType: "person", relatedEntityId: "child-1", relatedPersonId: "child-1" }] }));
    const other = resolvePersonAssertion(state, incoming({ provider: "csv", providerConnectionKey: "other", externalPersonId: "other", displayName: "Another Adult", identifiers: [] }));
    const possible = resolvePersonAssertion(state, incoming({ provider: "gamechanger", providerConnectionKey: "gc-org-a", externalPersonId: "gc-kyle", identifiers: [], relationships: [{ relationshipType: "guardian_of", relatedEntityType: "person", relatedEntityId: "child-1", relatedPersonId: "child-1" }] }));
    assert.throws(() => confirmIdentityMatch(state, { organizationId: ORG_A, sourceIdentityKey: possible.sourceIdentityKey, personId: other.personId!, actorType: "authenticated_user", actorId: "auth-kyle" }), /proposed/);
  });

  it("Scenario F: unlink preserves source records and audit history, then permits correction", () => {
    const state = createIdentityState();
    const first = resolvePersonAssertion(state, incoming());
    const secondInput = incoming({ provider: "gamechanger", providerConnectionKey: "gc-org-a", externalPersonId: "gc-kyle" });
    const linked = resolvePersonAssertion(state, secondInput);
    const previous = unlinkSourceIdentity(state, { organizationId: ORG_A, sourceIdentityKey: linked.sourceIdentityKey, actorId: "admin-1" });
    const replacement = resolvePersonAssertion(state, incoming({ provider: "csv", providerConnectionKey: "correction", externalPersonId: "replacement", displayName: "Kyle J McGraw", identifiers: [] }));
    confirmIdentityMatch(state, { organizationId: ORG_A, sourceIdentityKey: linked.sourceIdentityKey, personId: replacement.personId!, actorType: "administrator", actorId: "admin-1" });

    assert.equal(previous, first.personId);
    assert.equal(state.sourceIdentities.size, 3);
    assert.equal(state.sourceIdentities.get(linked.sourceIdentityKey)?.personId, replacement.personId);
    assert.ok(state.events.some((event) => event.eventType === "IDENTITY_UNLINKED" && event.previousPersonId === first.personId && event.reasonCodes.includes("ADMIN_UNLINKED_IDENTITY")));
    assert.ok(state.events.some((event) => event.eventType === "IDENTITY_LINKED" && event.previousPersonId === undefined && event.actorType === "administrator"));
  });

  it("Scenario G: keep-separate survives future syncs and prevents relinking", () => {
    const state = createIdentityState();
    const existing = resolvePersonAssertion(state, incoming());
    const secondInput = incoming({ provider: "leagueapps", providerConnectionKey: "la-org-a", externalPersonId: "la-other-kyle" });
    const possible = resolvePersonAssertion(state, secondInput);
    assert.equal(possible.outcome, "LINKED");
    unlinkSourceIdentity(state, { organizationId: ORG_A, sourceIdentityKey: possible.sourceIdentityKey, actorId: "admin-1" });
    keepIdentitySeparate(state, { organizationId: ORG_A, sourceIdentityKey: possible.sourceIdentityKey, personId: existing.personId!, actorId: "admin-1" });
    const distinct = resolvePersonAssertion(state, secondInput);
    const replay = resolvePersonAssertion(state, secondInput);

    assert.equal(distinct.outcome, "DISTINCT");
    assert.notEqual(distinct.personId, existing.personId);
    assert.equal(replay.outcome, "LINKED");
    assert.equal(replay.personId, distinct.personId);
    assert.deepEqual(replay.reasonCodes, ["SOURCE_IDENTITY_ALREADY_LINKED"]);
  });

  it("Scenario H: repeated provider ingestion is idempotent across people, identifiers, relationships, and provenance", () => {
    const state = createIdentityState();
    const assertion = incoming({ relationships: [{ relationshipType: "member_of", relatedEntityType: "team", relatedEntityId: "celtics-10u" }], facts: [{ domain: "roster", key: "jersey_number", value: 12 }] });
    const first = resolvePersonAssertion(state, assertion);
    const before = { people: state.people.size, sources: state.sourceIdentities.size, identifiers: state.identifiers.length, relationships: state.relationships.length, provenance: state.provenance.length };
    const replay = resolvePersonAssertion(state, assertion);

    assert.equal(replay.personId, first.personId);
    assert.deepEqual({ people: state.people.size, sources: state.sourceIdentities.size, identifiers: state.identifiers.length, relationships: state.relationships.length, provenance: state.provenance.length }, before);
  });

  it("audits a source identifier when its verification state is upgraded", () => {
    const state = createIdentityState();
    const assertion = incoming({ identifiers: [{ type: "email", value: "kyle@example.com", verificationStatus: "unverified" }] });
    resolvePersonAssertion(state, assertion);
    resolvePersonAssertion(state, { ...assertion, identifiers: [{ type: "email", value: "kyle@example.com", verificationStatus: "provider_verified" }] });

    assert.equal(state.identifiers[0].verificationStatus, "provider_verified");
    assert.ok(state.events.some((event) => event.eventType === "IDENTIFIER_VERIFIED" && event.reasonCodes.includes("VERIFIED_EMAIL_EXACT_MATCH")));
  });

  it("Scenario I: identity review is organization-scoped and cross-organization access is denied", () => {
    assert.equal(canReviewIdentity({ actorOrganizationIds: [ORG_A], actorRoles: ["organization_admin"], targetOrganizationId: ORG_A }), true);
    assert.equal(canReviewIdentity({ actorOrganizationIds: [ORG_A], actorRoles: ["organization_admin"], targetOrganizationId: ORG_B }), false);
    assert.equal(canReviewIdentity({ actorOrganizationIds: [ORG_A], actorRoles: ["parent"], targetOrganizationId: ORG_A }), false);
    assert.equal(canReviewIdentity({ actorOrganizationIds: [], actorRoles: [], targetOrganizationId: ORG_A }), false);
    assert.equal(canReviewIdentity({ actorOrganizationIds: [], actorRoles: ["super_admin"], targetOrganizationId: ORG_B }), true);
  });

  it("Scenario J: an account claim attaches to the existing person and keeps family context", () => {
    const state = createIdentityState();
    const child = resolvePersonAssertion(state, incoming({ externalPersonId: "se-charlie", displayName: "Charlie McGraw", identifiers: [] }));
    const guardian = resolvePersonAssertion(state, incoming({ relationships: [{ relationshipType: "guardian_of", relatedEntityType: "person", relatedEntityId: child.personId!, relatedPersonId: child.personId }] }));
    const claimed = claimAccountForPerson(state, { authUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", organizationId: ORG_A, verifiedIdentifiers: [{ type: "email", value: "kyle@example.com", verificationStatus: "gameday_verified" }], actorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });

    assert.equal(claimed.outcome, "LINKED");
    assert.equal(claimed.personId, guardian.personId);
    assert.equal(personCount(state), 2);
    assert.ok(state.relationships.some((relationship) => relationship.subjectPersonId === guardian.personId && relationship.relatedPersonId === child.personId));
    assert.equal(state.events.at(-1)?.eventType, "ACCOUNT_CLAIMED");
  });

  it("preserves conflicting provider truths and selects GameDay Truth only through field authority", () => {
    const state = createIdentityState();
    const first = resolvePersonAssertion(state, incoming({ facts: [{ domain: "roster", key: "jersey_number", value: 12 }] }));
    resolvePersonAssertion(state, incoming({ provider: "gamechanger", providerConnectionKey: "gc-org-a", externalPersonId: "gc-kyle", facts: [{ domain: "roster", key: "jersey_number", value: 7 }] }));
    assert.equal(state.provenance.filter((fact) => fact.personId === first.personId && fact.factKey === "jersey_number").length, 2);

    const selected = selectAuthoritativeAssertion([
      { provider: "sportsengine", value: 12 },
      { provider: "gamechanger", value: 7 },
    ], [
      { organizationId: ORG_A, factDomain: "roster", factKey: "jersey_number", provider: "sportsengine", priority: 100 },
      { organizationId: ORG_A, factDomain: "live_game", factKey: "score", provider: "gamechanger", priority: 100 },
    ], { organizationId: ORG_A, factDomain: "roster", factKey: "jersey_number" });
    assert.deepEqual(selected, { provider: "sportsengine", value: 12 });
  });

  it("uses provider, provider connection, and external person ID as the durable source key", () => {
    assert.equal(sourceIdentityKey(incoming()), "sportsengine:sportsengine-org-a:se-kyle");
    assert.notEqual(sourceIdentityKey(incoming()), sourceIdentityKey(incoming({ providerConnectionKey: "sportsengine-org-b" })));
  });

  it("routes provider people through the central resolver and rejects adapter scope drift", () => {
    const state = createPipelineState();
    const person = incoming({ providerConnectionKey: "integration-se-a" });
    const payload = { provider: "sportsengine" as const, integrationId: "integration-se-a", organizationId: ORG_A, idempotencyKey: "people-sync-1", people: [person] };
    applyProviderPayload(state, payload);
    applyProviderPayload(state, { provider: "gamechanger" as const, integrationId: "integration-gc-a", organizationId: ORG_A, idempotencyKey: "people-sync-2", people: [incoming({ provider: "gamechanger", providerConnectionKey: "integration-gc-a", externalPersonId: "gc-kyle" })] });

    assert.equal(state.identity.people.size, 1);
    assert.equal(state.identity.sourceIdentities.size, 2);
    assert.throws(() => applyProviderPayload(state, { ...payload, idempotencyKey: "people-sync-bad", people: [incoming({ organizationId: ORG_B, providerConnectionKey: "integration-se-a" })] }), /scope/);
    assert.equal(state.idempotencyKeys.has("people-sync-bad"), false);
  });
});
