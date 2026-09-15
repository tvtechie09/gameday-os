import { createHash } from "node:crypto";
import { getIntegrationProvider, type IntegrationMode, type IntegrationProviderKey } from "./integration-framework.ts";

export type DataConfidence = "HIGH" | "MEDIUM" | "LOW";
export type IntegrationHealth = "HEALTHY" | "DEGRADED" | "STALE" | "ERROR" | "DISCONNECTED" | "DISABLED";
export type ConflictSeverity = "CRITICAL" | "IMPORTANT" | "INFORMATIONAL";
export type CanonicalEntityType = "organization" | "season" | "team" | "participant" | "event" | "venue" | "playable_space" | "tournament" | "standing" | "live_source";

export type NormalizedTeam = {
  externalId: string; name: string; season?: string; organization?: string; activity?: string; metadata: Record<string, unknown>;
};
export type NormalizedParticipant = {
  externalId: string; teamExternalId: string; displayName?: string; role: string; metadata: Record<string, unknown>;
};
export type NormalizedVenue = {
  externalId: string; name: string; address?: string; providerVenueKey?: string; metadata: Record<string, unknown>;
};
export type NormalizedEvent = {
  externalId: string;
  eventType: "GAME" | "PRACTICE" | "TOURNAMENT" | "OTHER";
  startsAt: string;
  arrivalAt?: string;
  teamExternalId?: string;
  opponent?: string;
  venueExternalId?: string;
  venueName?: string;
  fieldName?: string;
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED";
  tournamentExternalId?: string;
  externalUrl?: string;
  sourceUpdatedAt?: string;
  metadata: Record<string, unknown>;
};

export type ProviderPayload = {
  provider: IntegrationProviderKey;
  integrationId: string;
  organizationId: string;
  idempotencyKey: string;
  events?: NormalizedEvent[];
  teams?: NormalizedTeam[];
  participants?: NormalizedParticipant[];
  venues?: NormalizedVenue[];
};

export type ExternalEntityLink = {
  provider: string; integrationId: string; entityType: CanonicalEntityType; canonicalEntityId: string; externalId: string;
  sourceHash: string; sourceUpdatedAt?: string; lastSyncedAt: string; confidence: DataConfidence; matchEvidence: string[]; externalUrl?: string;
};

export type ProviderConflict = {
  key: string; canonicalEntityId: string; entityType: CanonicalEntityType; field: string; providerA: string; valueA: unknown;
  providerB: string; valueB: unknown; canonicalValue: unknown; severity: ConflictSeverity; state: "OPEN" | "AUTO_RESOLVED" | "MANUALLY_RESOLVED" | "IGNORED";
};

export type MatchResult = { confidence: DataConfidence; score: number; evidence: string[]; autoLink: boolean };
export type FieldOverride = { field: string; value: unknown; effectiveAt: string; expiresAt?: string; reason: string; authority: string };

export const SOURCE_PRECEDENCE = Object.freeze({
  explicit_gameday_override: 600,
  gameday_venue_operations: 500,
  gameday_tournament_assignment: 450,
  organization_authoritative_provider: 400,
  team_authoritative_provider: 300,
  secondary_provider: 200,
  manual_fallback: 100,
});

export const FIELD_OWNERSHIP = Object.freeze({
  providerOwned: ["externalId", "sourceUpdatedAt", "providerScheduleVersion"],
  gameDayOwned: ["venueOperationalState", "arrivalGuidance", "placeHref", "liveSources", "edgeAssociations", "publicAnnouncements"],
  resolved: ["startsAt", "arrivalAt", "venueExternalId", "venueName", "fieldName", "opponent", "status"],
});

const SENSITIVE_KEYS = /(^|_)(payment|billing|card|medical|health|waiver|form_answer|ssn|bank|token|secret|password|email|phone|contact)(_|$)/i;
const SAFE_EXTERNAL_ID = /^[A-Za-z0-9][A-Za-z0-9._:@/\-]{0,254}$/;
const CRITICAL_FIELDS = new Set(["startsAt", "venueExternalId", "venueName", "fieldName", "status"]);
const IMPORTANT_FIELDS = new Set(["opponent", "arrivalAt", "teamExternalId"]);

export function stableSourceHash(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function sanitizeProviderMetadata(metadata: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEYS.test(key)) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) sanitized[key] = sanitizeProviderMetadata(value as Record<string, unknown>);
    else if (typeof value === "string") sanitized[key] = value.slice(0, 500);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) sanitized[key] = value;
  }
  return sanitized;
}

export function validateExternalId(value: string) {
  if (!SAFE_EXTERNAL_ID.test(value)) throw new Error("Provider external ID is invalid.");
  return value;
}

export function normalizeName(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\b(illinois|new lenox|sports complex|baseball|softball)\b/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeEvent(provider: IntegrationProviderKey, input: NormalizedEvent): NormalizedEvent {
  if (!getIntegrationProvider(provider)) throw new Error("Unknown provider.");
  validateExternalId(input.externalId);
  if (!Number.isFinite(new Date(input.startsAt).getTime())) throw new Error("Provider event start time is invalid.");
  return {
    ...input,
    opponent: input.opponent?.trim() || undefined,
    venueName: input.venueName?.trim() || undefined,
    fieldName: input.fieldName?.trim() || undefined,
    externalUrl: resolveSafeProviderLink(provider, input.externalUrl),
    metadata: sanitizeProviderMetadata(input.metadata),
  };
}

export function normalizeTeam(provider: IntegrationProviderKey, input: NormalizedTeam): NormalizedTeam {
  if (!getIntegrationProvider(provider)) throw new Error("Unknown provider.");
  validateExternalId(input.externalId);
  const name = input.name.trim();
  if (!name) throw new Error("Provider team name is required.");
  return { ...input, name, season: input.season?.trim() || undefined, organization: input.organization?.trim() || undefined, activity: input.activity?.trim() || undefined, metadata: sanitizeProviderMetadata(input.metadata) };
}

export function normalizeParticipant(provider: IntegrationProviderKey, input: NormalizedParticipant): NormalizedParticipant {
  if (!getIntegrationProvider(provider)) throw new Error("Unknown provider.");
  validateExternalId(input.externalId);
  validateExternalId(input.teamExternalId);
  const role = input.role.trim();
  if (!role) throw new Error("Provider participant role is required.");
  return { ...input, displayName: input.displayName?.trim().slice(0, 120) || undefined, role, metadata: sanitizeProviderMetadata(input.metadata) };
}

export function normalizeVenue(provider: IntegrationProviderKey, input: NormalizedVenue): NormalizedVenue {
  if (!getIntegrationProvider(provider)) throw new Error("Unknown provider.");
  validateExternalId(input.externalId);
  if (input.providerVenueKey) validateExternalId(input.providerVenueKey);
  const name = input.name.trim();
  if (!name) throw new Error("Provider venue name is required.");
  return { ...input, name, address: input.address?.trim().slice(0, 300) || undefined, metadata: sanitizeProviderMetadata(input.metadata) };
}

export function resolveSafeProviderLink(providerKey: string, rawUrl?: string | null) {
  if (!rawUrl) return undefined;
  const provider = getIntegrationProvider(providerKey);
  if (!provider || provider.externalDomains.length === 0) return undefined;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    const allowed = provider.externalDomains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
    return allowed ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function conflictSeverity(field: string): ConflictSeverity {
  if (CRITICAL_FIELDS.has(field)) return "CRITICAL";
  if (IMPORTANT_FIELDS.has(field)) return "IMPORTANT";
  return "INFORMATIONAL";
}

export function conflictKey(entityId: string, field: string, providerA: string, providerB: string) {
  return stableSourceHash([entityId, field, ...[providerA, providerB].sort()]);
}

export function detectEventConflicts(canonicalEntityId: string, canonical: NormalizedEvent, incoming: NormalizedEvent, canonicalProvider: string, incomingProvider: string) {
  const fields: Array<keyof NormalizedEvent> = ["startsAt", "arrivalAt", "teamExternalId", "opponent", "venueExternalId", "venueName", "fieldName", "status"];
  return fields.flatMap((field): ProviderConflict[] => {
    if (stableJson(canonical[field]) === stableJson(incoming[field])) return [];
    return [{ key: conflictKey(canonicalEntityId, field, canonicalProvider, incomingProvider), canonicalEntityId, entityType: "event", field, providerA: canonicalProvider, valueA: canonical[field], providerB: incomingProvider, valueB: incoming[field], canonicalValue: canonical[field], severity: conflictSeverity(field), state: conflictSeverity(field) === "INFORMATIONAL" ? "AUTO_RESOLVED" : "OPEN" }];
  });
}

export function matchEvents(a: NormalizedEvent, b: NormalizedEvent): MatchResult {
  const evidence: string[] = [];
  let score = 0;
  if (a.teamExternalId && a.teamExternalId === b.teamExternalId) { score += 35; evidence.push("same team mapping"); }
  if (normalizeName(a.opponent || "") && normalizeName(a.opponent || "") === normalizeName(b.opponent || "")) { score += 20; evidence.push("same normalized opponent"); }
  const timeDeltaMinutes = Math.abs(new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()) / 60_000;
  if (timeDeltaMinutes <= 15) { score += 25; evidence.push("start times within 15 minutes"); }
  else if (timeDeltaMinutes <= 60) { score += 10; evidence.push("start times within 60 minutes"); }
  if (a.venueExternalId && a.venueExternalId === b.venueExternalId) { score += 15; evidence.push("same mapped venue"); }
  if (normalizeName(a.fieldName || "") && normalizeName(a.fieldName || "") === normalizeName(b.fieldName || "")) { score += 5; evidence.push("same normalized field"); }
  const confidence: DataConfidence = score >= 80 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
  return { confidence, score, evidence, autoLink: confidence === "HIGH" };
}

export function resolveProviderField<T>(input: { providerValue: T; currentValue: T; providerAuthority: keyof typeof SOURCE_PRECEDENCE; currentAuthority: keyof typeof SOURCE_PRECEDENCE; override?: FieldOverride; now?: string }) {
  const now = new Date(input.now || Date.now()).getTime();
  const overrideActive = input.override && new Date(input.override.effectiveAt).getTime() <= now && (!input.override.expiresAt || new Date(input.override.expiresAt).getTime() > now);
  if (overrideActive) return { value: input.override?.value as T, source: "explicit_gameday_override" as const, overridden: true };
  const providerWins = SOURCE_PRECEDENCE[input.providerAuthority] > SOURCE_PRECEDENCE[input.currentAuthority];
  return { value: providerWins ? input.providerValue : input.currentValue, source: providerWins ? input.providerAuthority : input.currentAuthority, overridden: false };
}

export const FRESHNESS_POLICY: Record<string, { healthyMinutes: number; staleMinutes: number }> = {
  sportsengine: { healthyMinutes: 60, staleMinutes: 24 * 60 },
  daktronics: { healthyMinutes: 2, staleMinutes: 10 },
  csv: { healthyMinutes: 24 * 60, staleMinutes: 7 * 24 * 60 },
  hometeamsonline: { healthyMinutes: 12 * 60, staleMinutes: 3 * 24 * 60 },
  default: { healthyMinutes: 24 * 60, staleMinutes: 3 * 24 * 60 },
};

export function integrationHealth(input: { provider: string; enabled: boolean; connected: boolean; lastSuccessfulSyncAt?: string | null; lastAttemptedSyncAt?: string | null; errorCount?: number; now?: string }): IntegrationHealth {
  if (!input.enabled) return "DISABLED";
  if (!input.connected) return "DISCONNECTED";
  if ((input.errorCount || 0) > 0 && !input.lastSuccessfulSyncAt) return "ERROR";
  if (!input.lastSuccessfulSyncAt) return "DEGRADED";
  const ageMinutes = (new Date(input.now || Date.now()).getTime() - new Date(input.lastSuccessfulSyncAt).getTime()) / 60_000;
  const policy = FRESHNESS_POLICY[input.provider] || FRESHNESS_POLICY.default;
  if (ageMinutes > policy.staleMinutes) return "STALE";
  if ((input.errorCount || 0) > 0 || ageMinutes > policy.healthyMinutes) return "DEGRADED";
  return "HEALTHY";
}

export interface ProviderAdapter<RawPayload> {
  provider: IntegrationProviderKey;
  mode: IntegrationMode;
  fetchOrReceive(input: unknown): Promise<RawPayload>;
  validate(payload: RawPayload): void;
  normalize(payload: RawPayload): ProviderPayload;
}

export type PipelineState = {
  idempotencyKeys: Set<string>;
  links: Map<string, ExternalEntityLink>;
  events: Map<string, NormalizedEvent>;
  conflicts: Map<string, ProviderConflict>;
  changes: Array<{ canonicalEntityId: string; fields: string[] }>;
};

export function createPipelineState(): PipelineState {
  return { idempotencyKeys: new Set(), links: new Map(), events: new Map(), conflicts: new Map(), changes: [] };
}

export function applyProviderPayload(state: PipelineState, payload: ProviderPayload, now = new Date().toISOString()) {
  if (state.idempotencyKeys.has(payload.idempotencyKey)) return { replay: true, created: 0, updated: 0, unchanged: 0, conflicts: 0, changes: 0 };
  state.idempotencyKeys.add(payload.idempotencyKey);
  let created = 0, updated = 0, unchanged = 0, conflictCount = 0, changeCount = 0;
  for (const rawEvent of payload.events || []) {
    const event = normalizeEvent(payload.provider, rawEvent);
    const linkKey = `${payload.integrationId}:event:${event.externalId}`;
    const hash = stableSourceHash(event);
    const existingLink = state.links.get(linkKey);
    const canonicalId = existingLink?.canonicalEntityId || `event:${payload.organizationId}:${event.externalId}`;
    const existing = state.events.get(canonicalId);
    if (existingLink?.sourceHash === hash) { unchanged += 1; continue; }
    if (existing) {
      const conflicts = detectEventConflicts(canonicalId, existing, event, existingLink?.provider || "gameday_native", payload.provider);
      for (const conflict of conflicts) state.conflicts.set(conflict.key, conflict);
      conflictCount += conflicts.length;
      const changedFields = Object.keys(event).filter((field) => stableJson(existing[field as keyof NormalizedEvent]) !== stableJson(event[field as keyof NormalizedEvent]));
      if (changedFields.length) { state.changes.push({ canonicalEntityId: canonicalId, fields: changedFields }); changeCount += 1; }
      state.events.set(canonicalId, { ...event, metadata: { ...existing.metadata, ...event.metadata } });
      updated += 1;
    } else {
      state.events.set(canonicalId, event); created += 1;
    }
    state.links.set(linkKey, { provider: payload.provider, integrationId: payload.integrationId, entityType: "event", canonicalEntityId: canonicalId, externalId: event.externalId, sourceHash: hash, sourceUpdatedAt: event.sourceUpdatedAt, lastSyncedAt: now, confidence: "HIGH", matchEvidence: ["provider external ID"], externalUrl: event.externalUrl });
  }
  return { replay: false, created, updated, unchanged, conflicts: conflictCount, changes: changeCount };
}
