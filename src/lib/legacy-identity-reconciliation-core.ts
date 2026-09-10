export const LEGACY_RECONCILIATION_VERSION = "gameday-legacy-reconciliation-v1";

export type LegacyReconciliationClassification =
  | "ALREADY_MAPPED"
  | "DETERMINISTIC_LINK"
  | "POSSIBLE_MATCH"
  | "DISTINCT_NEW_PERSON"
  | "ORG_MAPPING_REQUIRED"
  | "CONFLICTING_STRONG_IDENTIFIER"
  | "SOURCE_KEY_REQUIRED"
  | "SKIP_INACTIVE";

export type LegacyPersonInput = {
  legacyPersonId: string;
  stateId: string;
  source: string;
  sourceKey?: string | null;
  active?: boolean;
  synthetic?: boolean;
  email?: string | null;
  phone?: string | null;
  updatedAt: string;
};

export type ReconciliationEvidence = {
  organizationId: string | null;
  existingCanonicalPersonId?: string | null;
  durableSourceCanonicalPersonId?: string | null;
  possibleCanonicalPersonIds?: string[];
  conflictingCanonicalPersonIds?: string[];
  separatedCanonicalPersonIds?: string[];
  relationshipCount?: number;
};

export type LegacyReconciliationDecision = {
  legacyPersonId: string;
  organizationId: string | null;
  classification: LegacyReconciliationClassification;
  canonicalCandidateId: string | null;
  reasonCode: string;
  relationshipProjectionCount: number;
  fingerprint: string;
};

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`).join(",")}}`;
}

export function reconciliationFingerprint(value: unknown): string {
  const input = `${LEGACY_RECONCILIATION_VERSION}:${stable(value)}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${LEGACY_RECONCILIATION_VERSION}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function hasDurableSourceKey(person: LegacyPersonInput): boolean {
  if (person.sourceKey?.trim()) return true;
  return !["csv", "import", "imported", "roster_csv"].includes(person.source.trim().toLowerCase());
}

export function classifyLegacyPerson(person: LegacyPersonInput, evidence: ReconciliationEvidence): LegacyReconciliationDecision {
  const separated = new Set(evidence.separatedCanonicalPersonIds ?? []);
  const possible = [...new Set(evidence.possibleCanonicalPersonIds ?? [])].filter((id) => !separated.has(id));
  const conflicting = [...new Set(evidence.conflictingCanonicalPersonIds ?? [])].filter((id) => !separated.has(id));
  let classification: LegacyReconciliationClassification;
  let candidate: string | null = null;
  let reasonCode: string;

  if (person.active === false || person.synthetic) {
    classification = "SKIP_INACTIVE"; reasonCode = person.synthetic ? "SYNTHETIC_RECORD" : "INACTIVE_RECORD";
  } else if (!evidence.organizationId) {
    classification = "ORG_MAPPING_REQUIRED"; reasonCode = "EXPLICIT_STATE_ORGANIZATION_MAPPING_REQUIRED";
  } else if (evidence.existingCanonicalPersonId) {
    classification = "ALREADY_MAPPED"; candidate = evidence.existingCanonicalPersonId; reasonCode = "LEGACY_LINK_EXISTS";
  } else if (!hasDurableSourceKey(person)) {
    classification = "SOURCE_KEY_REQUIRED"; reasonCode = "DURABLE_IMPORT_SOURCE_KEY_REQUIRED";
  } else if (conflicting.length > 1) {
    classification = "CONFLICTING_STRONG_IDENTIFIER"; reasonCode = "VERIFIED_IDENTIFIERS_DISAGREE";
  } else if (evidence.durableSourceCanonicalPersonId && !separated.has(evidence.durableSourceCanonicalPersonId)) {
    classification = "DETERMINISTIC_LINK"; candidate = evidence.durableSourceCanonicalPersonId; reasonCode = "EXACT_DURABLE_SOURCE_IDENTITY";
  } else if (possible.length > 0) {
    classification = "POSSIBLE_MATCH"; candidate = possible.length === 1 ? possible[0] : null; reasonCode = "UNVERIFIED_IDENTIFIER_REVIEW_REQUIRED";
  } else {
    classification = "DISTINCT_NEW_PERSON"; reasonCode = separated.size > 0 ? "CANDIDATES_EXPLICITLY_SEPARATED" : "NO_DURABLE_MATCH";
  }

  const fingerprint = reconciliationFingerprint({ person: { legacyPersonId: person.legacyPersonId, stateId: person.stateId, source: person.source, sourceKey: person.sourceKey ?? null, updatedAt: person.updatedAt }, evidence: { ...evidence, possibleCanonicalPersonIds: possible, conflictingCanonicalPersonIds: conflicting } });
  return { legacyPersonId: person.legacyPersonId, organizationId: evidence.organizationId, classification, canonicalCandidateId: candidate, reasonCode, relationshipProjectionCount: evidence.relationshipCount ?? 0, fingerprint };
}

export function summarizeLegacyDecisions(decisions: LegacyReconciliationDecision[]) {
  return decisions.reduce<Record<LegacyReconciliationClassification, number>>((counts, decision) => {
    counts[decision.classification] += 1;
    return counts;
  }, { ALREADY_MAPPED: 0, DETERMINISTIC_LINK: 0, POSSIBLE_MATCH: 0, DISTINCT_NEW_PERSON: 0, ORG_MAPPING_REQUIRED: 0, CONFLICTING_STRONG_IDENTIFIER: 0, SOURCE_KEY_REQUIRED: 0, SKIP_INACTIVE: 0 });
}

export function previewIsCurrent(decision: LegacyReconciliationDecision, person: LegacyPersonInput, evidence: ReconciliationEvidence): boolean {
  return decision.fingerprint === classifyLegacyPerson(person, evidence).fingerprint;
}

export function maskLegacyIdentifier(value: string | null | undefined): string {
  if (!value) return "Not provided";
  const trimmed = value.trim();
  if (trimmed.includes("@")) {
    const [name, domain] = trimmed.split("@");
    return `${name.slice(0, 1)}***@${domain}`;
  }
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 4 ? `***-***-${digits.slice(-4)}` : "***";
}
