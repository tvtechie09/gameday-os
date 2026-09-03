import { createHash } from "node:crypto";

export const IDENTITY_OUTCOMES = ["LINKED", "POSSIBLE_MATCH", "DISTINCT"] as const;
export type IdentityOutcome = (typeof IDENTITY_OUTCOMES)[number];

export const IDENTITY_REASON_CODES = [
  "SOURCE_IDENTITY_ALREADY_LINKED",
  "VERIFIED_EMAIL_EXACT_MATCH",
  "VERIFIED_PHONE_EXACT_MATCH",
  "ACCOUNT_ALREADY_CLAIMED",
  "USER_CONFIRMED_MATCH",
  "ADMIN_CONFIRMED_MATCH",
  "ADMIN_UNLINKED_IDENTITY",
  "SAME_GUARDIAN_AND_CHILD_CONTEXT",
  "AMBIGUOUS_IDENTIFIER",
  "NAME_ONLY_INSUFFICIENT",
  "CONFLICTING_STRONG_IDENTIFIERS",
  "EXPLICITLY_MARKED_DISTINCT",
  "NEW_SOURCE_IDENTITY",
] as const;
export type IdentityReasonCode = (typeof IDENTITY_REASON_CODES)[number];

export type PersonIdentifierType = "email" | "phone";
export type IdentifierVerification = "unverified" | "provider_verified" | "gameday_verified";
export type IdentityActorType = "system" | "authenticated_user" | "administrator";
export type PersonStatus = "active" | "inactive" | "archived";
export type SourceIdentityStatus = "active" | "inactive" | "disconnected" | "stale" | "deleted_at_source";
export type RelationshipType = "guardian_of" | "coach_of" | "member_of" | "volunteer_for";

export type CanonicalPerson = {
  id: string;
  displayName: string;
  preferredName?: string;
  status: PersonStatus;
  createdAt: string;
  updatedAt: string;
};

export type PersonIdentifier = {
  id: string;
  personId: string;
  organizationId: string;
  type: PersonIdentifierType;
  normalizedValue: string;
  displayValue: string;
  verificationStatus: IdentifierVerification;
  sourceIdentityKey: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type SourceIdentity = {
  key: string;
  provider: string;
  providerConnectionKey: string;
  organizationId: string;
  externalPersonId: string;
  personId?: string;
  status: SourceIdentityStatus;
  sourceUpdatedAt?: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type PersonRelationship = {
  id: string;
  organizationId: string;
  subjectPersonId: string;
  relationshipType: RelationshipType;
  relatedPersonId?: string;
  relatedEntityType: "person" | "team" | "organization" | "event";
  relatedEntityId: string;
  sourceIdentityKey: string;
  status: "active" | "inactive" | "deleted_at_source";
  firstSeenAt: string;
  lastSeenAt: string;
};

export type ProvenanceAssertion = {
  id: string;
  organizationId: string;
  personId: string;
  sourceIdentityKey: string;
  factDomain: string;
  factKey: string;
  valueHash: string;
  sourceTimestamp?: string;
  ingestedAt: string;
  status: "current" | "stale" | "deleted_at_source";
};

export type IdentityResolutionEvent = {
  id: string;
  eventType:
    | "IDENTITY_LINKED"
    | "IDENTITY_UNLINKED"
    | "POSSIBLE_MATCH_CREATED"
    | "MATCH_REJECTED"
    | "ACCOUNT_CLAIMED"
    | "IDENTIFIER_ADDED"
    | "IDENTIFIER_VERIFIED"
    | "SOURCE_IDENTITY_ATTACHED";
  organizationId: string;
  personId?: string;
  sourceIdentityKey?: string;
  actorType: IdentityActorType;
  actorId?: string;
  reasonCodes: IdentityReasonCode[];
  previousPersonId?: string;
  createdAt: string;
};

export type IdentityAuthorityRule = {
  organizationId?: string;
  factDomain: string;
  factKey: string;
  provider: string;
  priority: number;
};

export type IncomingIdentifier = {
  type: PersonIdentifierType;
  value: string;
  verificationStatus: IdentifierVerification;
};

export type IncomingRelationship = {
  relationshipType: RelationshipType;
  relatedPersonId?: string;
  relatedEntityType: PersonRelationship["relatedEntityType"];
  relatedEntityId: string;
};

export type NormalizedPersonAssertion = {
  provider: string;
  providerConnectionKey: string;
  organizationId: string;
  externalPersonId: string;
  displayName: string;
  identifiers: IncomingIdentifier[];
  relationships?: IncomingRelationship[];
  facts?: Array<{ domain: string; key: string; value: unknown }>;
  sourceUpdatedAt?: string;
};

export type IdentityResolution = {
  outcome: IdentityOutcome;
  personId?: string;
  sourceIdentityKey: string;
  candidatePersonIds: string[];
  reasonCodes: IdentityReasonCode[];
  confidence: "deterministic" | "candidate" | "none";
};

type SeparationRule = { organizationId: string; sourceIdentityKey: string; personId: string };
type AccountPerson = { authUserId: string; personId: string; claimedAt: string; claimMethod: string };

export type IdentityState = {
  people: Map<string, CanonicalPerson>;
  organizationPeople: Set<string>;
  identifiers: PersonIdentifier[];
  sourceIdentities: Map<string, SourceIdentity>;
  relationships: PersonRelationship[];
  provenance: ProvenanceAssertion[];
  separationRules: SeparationRule[];
  resolutionCandidates: Map<string, Set<string>>;
  accountPeople: Map<string, AccountPerson>;
  events: IdentityResolutionEvent[];
};

export function createIdentityState(): IdentityState {
  return {
    people: new Map(),
    organizationPeople: new Set(),
    identifiers: [],
    sourceIdentities: new Map(),
    relationships: [],
    provenance: [],
    separationRules: [],
    resolutionCandidates: new Map(),
    accountPeople: new Map(),
    events: [],
  };
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

export function normalizePersonIdentifier(type: PersonIdentifierType, value: string) {
  return type === "email" ? normalizeEmail(value) : normalizePhone(value);
}

export function sourceIdentityKey(input: Pick<NormalizedPersonAssertion, "provider" | "providerConnectionKey" | "externalPersonId">) {
  return [input.provider.trim().toLowerCase(), input.providerConnectionKey.trim(), input.externalPersonId.trim()].join(":");
}

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function opaqueId(prefix: string, parts: unknown[]) {
  return `${prefix}_${stableHash(parts).slice(0, 24)}`;
}

function isVerified(identifier: IncomingIdentifier | PersonIdentifier) {
  return identifier.verificationStatus === "provider_verified" || identifier.verificationStatus === "gameday_verified";
}

function verificationRank(value: IdentifierVerification) {
  return value === "gameday_verified" ? 2 : value === "provider_verified" ? 1 : 0;
}

function normalizeDisplayName(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function personInOrganization(state: IdentityState, personId: string, organizationId: string) {
  return state.organizationPeople.has(`${organizationId}:${personId}`);
}

function candidateEvidence(state: IdentityState, assertion: NormalizedPersonAssertion) {
  const byReason = new Map<IdentityReasonCode, Set<string>>();
  for (const incoming of assertion.identifiers.filter(isVerified)) {
    const normalized = normalizePersonIdentifier(incoming.type, incoming.value);
    if (!normalized) continue;
    const reason: IdentityReasonCode = incoming.type === "email" ? "VERIFIED_EMAIL_EXACT_MATCH" : "VERIFIED_PHONE_EXACT_MATCH";
    for (const existing of state.identifiers) {
      if (!isVerified(existing) || existing.type !== incoming.type || existing.normalizedValue !== normalized) continue;
      if (!personInOrganization(state, existing.personId, assertion.organizationId)) continue;
      const set = byReason.get(reason) ?? new Set<string>();
      set.add(existing.personId);
      byReason.set(reason, set);
    }
  }
  return byReason;
}

function isExplicitlySeparate(state: IdentityState, organizationId: string, sourceKey: string, personId: string) {
  return state.separationRules.some((rule) => rule.organizationId === organizationId && rule.sourceIdentityKey === sourceKey && rule.personId === personId);
}

function addEvent(state: IdentityState, event: Omit<IdentityResolutionEvent, "id" | "createdAt">, now: string) {
  state.events.push({ ...event, id: opaqueId("ire", [event.eventType, event.sourceIdentityKey, event.personId, now, state.events.length]), createdAt: now });
}

function attachAssertion(state: IdentityState, assertion: NormalizedPersonAssertion, personId: string, sourceKey: string, now: string) {
  const existingSource = state.sourceIdentities.get(sourceKey);
  state.sourceIdentities.set(sourceKey, {
    key: sourceKey,
    provider: assertion.provider.trim().toLowerCase(),
    providerConnectionKey: assertion.providerConnectionKey.trim(),
    organizationId: assertion.organizationId,
    externalPersonId: assertion.externalPersonId.trim(),
    personId,
    status: "active",
    sourceUpdatedAt: assertion.sourceUpdatedAt,
    firstSeenAt: existingSource?.firstSeenAt ?? now,
    lastSeenAt: now,
  });
  state.organizationPeople.add(`${assertion.organizationId}:${personId}`);

  for (const incoming of assertion.identifiers) {
    const normalizedValue = normalizePersonIdentifier(incoming.type, incoming.value);
    if (!normalizedValue) continue;
    const existing = state.identifiers.find((item) => item.personId === personId && item.type === incoming.type && item.normalizedValue === normalizedValue && item.sourceIdentityKey === sourceKey);
    if (existing) {
      existing.lastSeenAt = now;
      if (verificationRank(incoming.verificationStatus) > verificationRank(existing.verificationStatus)) {
        existing.verificationStatus = incoming.verificationStatus;
        addEvent(state, {
          eventType: "IDENTIFIER_VERIFIED",
          organizationId: assertion.organizationId,
          personId,
          sourceIdentityKey: sourceKey,
          actorType: "system",
          reasonCodes: [incoming.type === "email" ? "VERIFIED_EMAIL_EXACT_MATCH" : "VERIFIED_PHONE_EXACT_MATCH"],
        }, now);
      }
    } else {
      state.identifiers.push({
        id: opaqueId("pi", [personId, incoming.type, normalizedValue, sourceKey]),
        personId,
        organizationId: assertion.organizationId,
        type: incoming.type,
        normalizedValue,
        displayValue: incoming.value.trim(),
        verificationStatus: incoming.verificationStatus,
        sourceIdentityKey: sourceKey,
        firstSeenAt: now,
        lastSeenAt: now,
      });
      addEvent(state, { eventType: "IDENTIFIER_ADDED", organizationId: assertion.organizationId, personId, sourceIdentityKey: sourceKey, actorType: "system", reasonCodes: [] }, now);
    }
  }

  for (const relationship of assertion.relationships ?? []) {
    const id = opaqueId("pr", [personId, relationship.relationshipType, relationship.relatedEntityType, relationship.relatedEntityId, sourceKey]);
    const existing = state.relationships.find((item) => item.id === id);
    if (existing) existing.lastSeenAt = now;
    else state.relationships.push({ id, organizationId: assertion.organizationId, subjectPersonId: personId, ...relationship, sourceIdentityKey: sourceKey, status: "active", firstSeenAt: now, lastSeenAt: now });
  }

  for (const fact of assertion.facts ?? []) {
    const id = opaqueId("pa", [personId, sourceKey, fact.domain, fact.key]);
    const next: ProvenanceAssertion = { id, organizationId: assertion.organizationId, personId, sourceIdentityKey: sourceKey, factDomain: fact.domain, factKey: fact.key, valueHash: stableHash(fact.value), sourceTimestamp: assertion.sourceUpdatedAt, ingestedAt: now, status: "current" };
    const index = state.provenance.findIndex((item) => item.id === id);
    if (index >= 0) state.provenance[index] = next;
    else state.provenance.push(next);
  }
}

export function resolvePersonAssertion(state: IdentityState, assertion: NormalizedPersonAssertion, now = new Date().toISOString()): IdentityResolution {
  const sourceKey = sourceIdentityKey(assertion);
  const existingSource = state.sourceIdentities.get(sourceKey);
  if (existingSource?.personId) {
    attachAssertion(state, assertion, existingSource.personId, sourceKey, now);
    state.resolutionCandidates.delete(sourceKey);
    return { outcome: "LINKED", personId: existingSource.personId, sourceIdentityKey: sourceKey, candidatePersonIds: [existingSource.personId], reasonCodes: ["SOURCE_IDENTITY_ALREADY_LINKED"], confidence: "deterministic" };
  }

  const evidence = candidateEvidence(state, assertion);
  const emailMatches = evidence.get("VERIFIED_EMAIL_EXACT_MATCH") ?? new Set<string>();
  const phoneMatches = evidence.get("VERIFIED_PHONE_EXACT_MATCH") ?? new Set<string>();
  const allCandidates = new Set([...emailMatches, ...phoneMatches]);
  const allowedCandidates = [...allCandidates].filter((personId) => !isExplicitlySeparate(state, assertion.organizationId, sourceKey, personId));
  const strongSets = [emailMatches, phoneMatches].filter((set) => set.size > 0);
  const conflicting = strongSets.length > 1 && strongSets.some((set) => !allowedCandidates.some((personId) => set.has(personId))) || allowedCandidates.length > 1;

  if (allowedCandidates.length === 1 && !conflicting) {
    const personId = allowedCandidates[0];
    const reasonCodes = ([...evidence.entries()].filter(([, ids]) => ids.has(personId)).map(([reason]) => reason)) as IdentityReasonCode[];
    attachAssertion(state, assertion, personId, sourceKey, now);
    state.resolutionCandidates.delete(sourceKey);
    addEvent(state, { eventType: "IDENTITY_LINKED", organizationId: assertion.organizationId, personId, sourceIdentityKey: sourceKey, actorType: "system", reasonCodes }, now);
    return { outcome: "LINKED", personId, sourceIdentityKey: sourceKey, candidatePersonIds: [personId], reasonCodes, confidence: "deterministic" };
  }

  const incomingGuardianTargets = new Set((assertion.relationships ?? []).filter((relationship) => relationship.relationshipType === "guardian_of").map((relationship) => relationship.relatedPersonId ?? relationship.relatedEntityId));
  const contextualCandidates = [...state.people.values()].filter((person) =>
    personInOrganization(state, person.id, assertion.organizationId)
    && normalizeDisplayName(person.displayName) === normalizeDisplayName(assertion.displayName)
    && !isExplicitlySeparate(state, assertion.organizationId, sourceKey, person.id)
    && state.relationships.some((relationship) => relationship.organizationId === assertion.organizationId && relationship.subjectPersonId === person.id && relationship.relationshipType === "guardian_of" && incomingGuardianTargets.has(relationship.relatedPersonId ?? relationship.relatedEntityId)),
  ).map((person) => person.id);
  if (allowedCandidates.length > 0 || contextualCandidates.length > 0) {
    const reasonCodes: IdentityReasonCode[] = conflicting ? ["CONFLICTING_STRONG_IDENTIFIERS"] : allowedCandidates.length > 1 ? ["AMBIGUOUS_IDENTIFIER"] : ["SAME_GUARDIAN_AND_CHILD_CONTEXT"];
    state.sourceIdentities.set(sourceKey, { key: sourceKey, provider: assertion.provider.trim().toLowerCase(), providerConnectionKey: assertion.providerConnectionKey.trim(), organizationId: assertion.organizationId, externalPersonId: assertion.externalPersonId.trim(), status: "active", sourceUpdatedAt: assertion.sourceUpdatedAt, firstSeenAt: now, lastSeenAt: now });
    state.resolutionCandidates.set(sourceKey, new Set(allowedCandidates.length ? allowedCandidates : contextualCandidates));
    addEvent(state, { eventType: "POSSIBLE_MATCH_CREATED", organizationId: assertion.organizationId, sourceIdentityKey: sourceKey, actorType: "system", reasonCodes }, now);
    return { outcome: "POSSIBLE_MATCH", sourceIdentityKey: sourceKey, candidatePersonIds: allowedCandidates.length ? allowedCandidates : contextualCandidates, reasonCodes, confidence: "candidate" };
  }

  const personId = opaqueId("person", [assertion.organizationId, sourceKey]);
  state.people.set(personId, { id: personId, displayName: assertion.displayName.trim(), status: "active", createdAt: now, updatedAt: now });
  attachAssertion(state, assertion, personId, sourceKey, now);
  state.resolutionCandidates.delete(sourceKey);
  const reasonCodes: IdentityReasonCode[] = state.separationRules.some((rule) => rule.sourceIdentityKey === sourceKey) ? ["EXPLICITLY_MARKED_DISTINCT"] : assertion.displayName.trim() ? ["NAME_ONLY_INSUFFICIENT", "NEW_SOURCE_IDENTITY"] : ["NEW_SOURCE_IDENTITY"];
  addEvent(state, { eventType: "SOURCE_IDENTITY_ATTACHED", organizationId: assertion.organizationId, personId, sourceIdentityKey: sourceKey, actorType: "system", reasonCodes }, now);
  return { outcome: "DISTINCT", personId, sourceIdentityKey: sourceKey, candidatePersonIds: [], reasonCodes, confidence: "none" };
}

export function confirmIdentityMatch(state: IdentityState, input: { organizationId: string; sourceIdentityKey: string; personId: string; actorType: "authenticated_user" | "administrator"; actorId: string }, now = new Date().toISOString()) {
  const source = state.sourceIdentities.get(input.sourceIdentityKey);
  if (!source || source.organizationId !== input.organizationId || !personInOrganization(state, input.personId, input.organizationId)) throw new Error("Identity match is outside the permitted organization scope.");
  if (input.actorType === "authenticated_user" && !state.resolutionCandidates.get(input.sourceIdentityKey)?.has(input.personId)) throw new Error("User confirmation must select a proposed identity candidate.");
  const previousPersonId = source.personId;
  source.personId = input.personId;
  state.resolutionCandidates.delete(input.sourceIdentityKey);
  const reason: IdentityReasonCode = input.actorType === "administrator" ? "ADMIN_CONFIRMED_MATCH" : "USER_CONFIRMED_MATCH";
  addEvent(state, { eventType: "IDENTITY_LINKED", organizationId: input.organizationId, personId: input.personId, sourceIdentityKey: input.sourceIdentityKey, actorType: input.actorType, actorId: input.actorId, previousPersonId, reasonCodes: [reason] }, now);
  return { outcome: "LINKED" as const, personId: input.personId, reasonCodes: [reason] };
}

export function keepIdentitySeparate(state: IdentityState, input: { organizationId: string; sourceIdentityKey: string; personId: string; actorId: string }, now = new Date().toISOString()) {
  if (!state.sourceIdentities.has(input.sourceIdentityKey) || !personInOrganization(state, input.personId, input.organizationId)) throw new Error("Identity separation is outside the permitted organization scope.");
  if (!isExplicitlySeparate(state, input.organizationId, input.sourceIdentityKey, input.personId)) state.separationRules.push({ organizationId: input.organizationId, sourceIdentityKey: input.sourceIdentityKey, personId: input.personId });
  addEvent(state, { eventType: "MATCH_REJECTED", organizationId: input.organizationId, personId: input.personId, sourceIdentityKey: input.sourceIdentityKey, actorType: "administrator", actorId: input.actorId, reasonCodes: ["EXPLICITLY_MARKED_DISTINCT"] }, now);
}

export function unlinkSourceIdentity(state: IdentityState, input: { organizationId: string; sourceIdentityKey: string; actorId: string }, now = new Date().toISOString()) {
  const source = state.sourceIdentities.get(input.sourceIdentityKey);
  if (!source || source.organizationId !== input.organizationId || !source.personId) throw new Error("Linked source identity was not found in the permitted organization scope.");
  const previousPersonId = source.personId;
  source.personId = undefined;
  addEvent(state, { eventType: "IDENTITY_UNLINKED", organizationId: input.organizationId, sourceIdentityKey: input.sourceIdentityKey, previousPersonId, actorType: "administrator", actorId: input.actorId, reasonCodes: ["ADMIN_UNLINKED_IDENTITY"] }, now);
  return previousPersonId;
}

export function claimAccountForPerson(state: IdentityState, input: { authUserId: string; organizationId: string; verifiedIdentifiers: IncomingIdentifier[]; actorId: string }, now = new Date().toISOString()): IdentityResolution {
  const existing = state.accountPeople.get(input.authUserId);
  if (existing) return { outcome: "LINKED", personId: existing.personId, sourceIdentityKey: `account:${input.authUserId}`, candidatePersonIds: [existing.personId], reasonCodes: ["ACCOUNT_ALREADY_CLAIMED"], confidence: "deterministic" };
  const assertion: NormalizedPersonAssertion = { provider: "gameday_account", providerConnectionKey: "auth", organizationId: input.organizationId, externalPersonId: input.authUserId, displayName: "", identifiers: input.verifiedIdentifiers.filter(isVerified) };
  const evidence = candidateEvidence(state, assertion);
  const candidates = new Set([...evidence.values()].flatMap((set) => [...set]));
  if (candidates.size !== 1) return { outcome: "POSSIBLE_MATCH", sourceIdentityKey: sourceIdentityKey(assertion), candidatePersonIds: [...candidates], reasonCodes: candidates.size > 1 ? ["AMBIGUOUS_IDENTIFIER"] : ["NAME_ONLY_INSUFFICIENT"], confidence: "candidate" };
  const personId = [...candidates][0];
  state.accountPeople.set(input.authUserId, { authUserId: input.authUserId, personId, claimedAt: now, claimMethod: "verified_identifier" });
  const reasonCodes = ([...evidence.entries()].filter(([, ids]) => ids.has(personId)).map(([reason]) => reason)) as IdentityReasonCode[];
  addEvent(state, { eventType: "ACCOUNT_CLAIMED", organizationId: input.organizationId, personId, actorType: "authenticated_user", actorId: input.actorId, reasonCodes }, now);
  return { outcome: "LINKED", personId, sourceIdentityKey: sourceIdentityKey(assertion), candidatePersonIds: [personId], reasonCodes, confidence: "deterministic" };
}

export function selectAuthoritativeAssertion<T extends { provider: string; value: unknown }>(assertions: T[], rules: IdentityAuthorityRule[], input: { organizationId?: string; factDomain: string; factKey: string }) {
  const priorities = new Map(rules.filter((rule) => (!rule.organizationId || rule.organizationId === input.organizationId) && rule.factDomain === input.factDomain && rule.factKey === input.factKey).map((rule) => [rule.provider, rule.priority]));
  return [...assertions].sort((a, b) => (priorities.get(b.provider) ?? 0) - (priorities.get(a.provider) ?? 0))[0];
}

export function canReviewIdentity(input: { actorOrganizationIds: string[]; actorRoles: string[]; targetOrganizationId: string }) {
  if (input.actorRoles.includes("super_admin")) return true;
  return input.actorOrganizationIds.includes(input.targetOrganizationId) && input.actorRoles.some((role) => ["organization_admin", "venue_director", "league_director", "tournament_director"].includes(role));
}
