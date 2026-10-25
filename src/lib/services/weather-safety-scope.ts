import type { FieldStatus, SessionStatus } from "../types.ts";
import type { WeatherSafetyFieldTarget, WeatherSafetySessionTarget } from "./weather-safety-core.ts";

export type WeatherSafetyCanonicalVenue = {
  id: string;
  organizationId: string | null;
};

export type WeatherSafetyCanonicalField = {
  id: string;
  organizationId: string | null;
  venueId: string;
  status: FieldStatus;
};

export type WeatherSafetyCanonicalSession = {
  id: string;
  organizationId: string | null;
  fieldId: string;
  status: SessionStatus;
};

export type ResolveWeatherSafetyScopeInput = {
  organizationId: string;
  venueId: string;
  requestedFieldIds: string[];
  requestedSessionIds: string[];
  venue: WeatherSafetyCanonicalVenue | null;
  fields: WeatherSafetyCanonicalField[];
  sessions: WeatherSafetyCanonicalSession[];
};

export type WeatherSafetyScopeDenied = {
  ok: false;
  reason:
    | "venue_not_found"
    | "venue_org_mismatch"
    | "duplicate_target"
    | "missing_target"
    | "field_scope_mismatch"
    | "session_scope_mismatch";
};

export type WeatherSafetyScopeResolved = {
  ok: true;
  fields: WeatherSafetyFieldTarget[];
  sessions: WeatherSafetySessionTarget[];
};

export type WeatherSafetyScopeResult = WeatherSafetyScopeDenied | WeatherSafetyScopeResolved;

function hasDuplicates(values: string[]) {
  return new Set(values).size !== values.length;
}

function exactRequestedSet(requestedIds: string[], actualIds: string[]) {
  if (requestedIds.length !== actualIds.length) return false;
  const requested = new Set(requestedIds);
  return actualIds.every((id) => requested.has(id));
}

/**
 * Converts DB-backed venue/field/session records into the canonical targets used
 * by the pure Weather & Safety planner. Caller-supplied organization/venue scope
 * is treated only as a request: target metadata comes exclusively from the
 * records loaded under the trusted server context.
 */
export function resolveWeatherSafetyScope(input: ResolveWeatherSafetyScopeInput): WeatherSafetyScopeResult {
  if (!input.venue || input.venue.id !== input.venueId) {
    return { ok: false, reason: "venue_not_found" };
  }

  if (input.venue.organizationId !== input.organizationId) {
    return { ok: false, reason: "venue_org_mismatch" };
  }

  if (hasDuplicates(input.requestedFieldIds) || hasDuplicates(input.requestedSessionIds)) {
    return { ok: false, reason: "duplicate_target" };
  }

  if (
    !exactRequestedSet(input.requestedFieldIds, input.fields.map((field) => field.id))
    || !exactRequestedSet(input.requestedSessionIds, input.sessions.map((session) => session.id))
  ) {
    return { ok: false, reason: "missing_target" };
  }

  if (
    input.fields.some((field) =>
      field.organizationId !== input.organizationId || field.venueId !== input.venueId,
    )
  ) {
    return { ok: false, reason: "field_scope_mismatch" };
  }

  const fieldIds = new Set(input.fields.map((field) => field.id));
  if (
    input.sessions.some((session) =>
      session.organizationId !== input.organizationId || !fieldIds.has(session.fieldId),
    )
  ) {
    return { ok: false, reason: "session_scope_mismatch" };
  }

  return {
    ok: true,
    fields: input.fields.map((field) => ({
      fieldId: field.id,
      organizationId: input.organizationId,
      venueId: input.venueId,
      status: field.status,
    })),
    sessions: input.sessions.map((session) => ({
      sessionId: session.id,
      organizationId: input.organizationId,
      venueId: input.venueId,
      fieldId: session.fieldId,
      status: session.status,
    })),
  };
}
