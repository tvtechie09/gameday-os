import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  planLightningAllClear,
  planManualLightningHold,
  projectWeatherSafetyForSessions,
  recordWeatherSafetyDelivery,
  WEATHER_SAFETY_INCIDENT_TYPES,
  WEATHER_SAFETY_PROVIDER_HEALTH_VALUES,
  type WeatherSafetyIncident,
} from "../src/lib/services/weather-safety-core.ts";

const baseInput = {
  incidentId: "incident-1",
  organizationId: "org-a",
  venueId: "venue-a",
  actorUserId: "gm-1",
  authorized: true,
  providerHealth: "offline" as const,
  source: "manual" as const,
  declaredAt: "2026-09-16T18:00:00.000Z",
  nextUpdateAt: "2026-09-16T18:15:00.000Z",
  clearanceCriteria: "Authorized venue official issues All Clear.",
  fields: [
    { fieldId: "field-open", organizationId: "org-a", venueId: "venue-a", status: "open" as const },
    { fieldId: "field-maintenance", organizationId: "org-a", venueId: "venue-a", status: "maintenance" as const },
  ],
  sessions: [
    { sessionId: "game-1", organizationId: "org-a", venueId: "venue-a", fieldId: "field-open", status: "active" as const },
    { sessionId: "game-2", organizationId: "org-a", venueId: "venue-a", fieldId: "field-maintenance", status: "scheduled" as const },
  ],
};

function requirePlanned(result: ReturnType<typeof planManualLightningHold>) {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(`Expected plan, got ${result.reason}`);
  return result.plan;
}

function quotedValues(checkList: string) {
  return [...checkList.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

test("SQL storage vocabulary stays aligned with the Weather & Safety domain contract", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/202609160001_weather_safety_incidents.sql", import.meta.url),
    "utf8",
  );

  const incidentTypes = sql.match(/incident_type text not null check \(incident_type in \(([^)]+)\)\)/)?.[1];
  const providerHealth = sql.match(/provider_health text not null check \(provider_health in \(([^)]+)\)\)/)?.[1];

  assert.ok(incidentTypes, "incident_type SQL constraint must exist");
  assert.ok(providerHealth, "provider_health SQL constraint must exist");
  assert.deepEqual(quotedValues(incidentTypes), [...WEATHER_SAFETY_INCIDENT_TYPES]);
  assert.deepEqual(quotedValues(providerHealth), [...WEATHER_SAFETY_PROVIDER_HEALTH_VALUES]);
});

test("authorized manual hold succeeds while provider is offline and preserves session lifecycle", () => {
  const plan = requirePlanned(planManualLightningHold(baseInput));

  assert.equal(plan.incident.providerHealth, "offline");
  assert.equal(plan.incident.status, "active");
  assert.deepEqual(plan.fieldUpdates, [
    { fieldId: "field-open", status: "delayed" },
    { fieldId: "field-maintenance", status: "delayed" },
  ]);
  assert.deepEqual(plan.sessionOverlays, [
    { sessionId: "game-1", hold: true },
    { sessionId: "game-2", hold: true },
  ]);
  assert.deepEqual(plan.incident.sessionLifecycleStates, { "game-1": "active", "game-2": "scheduled" });
});

test("unauthorized declaration is denied without a mutation plan", () => {
  const result = planManualLightningHold({ ...baseInput, authorized: false });
  assert.deepEqual(result, { ok: false, reason: "not_authorized" });
});

test("cross-tenant targets are rejected before any hold plan is produced", () => {
  const result = planManualLightningHold({
    ...baseInput,
    fields: [
      ...baseInput.fields,
      { fieldId: "foreign-field", organizationId: "org-b", venueId: "venue-b", status: "open" as const },
    ],
  });
  assert.deepEqual(result, { ok: false, reason: "scope_mismatch" });
});

test("all clear restores exact prior field states and removes only the session hold overlay", () => {
  const hold = requirePlanned(planManualLightningHold(baseInput));
  const result = planLightningAllClear({
    incident: hold.incident,
    actorUserId: "gm-2",
    authorized: true,
    clearedAt: "2026-09-16T18:30:00.000Z",
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(`Expected all-clear plan, got ${result.reason}`);

  assert.equal(result.plan.incident.status, "cleared");
  assert.deepEqual(result.plan.fieldUpdates, [
    { fieldId: "field-open", status: "open" },
    { fieldId: "field-maintenance", status: "maintenance" },
  ]);
  assert.deepEqual(result.plan.sessionOverlays, [
    { sessionId: "game-1", hold: false },
    { sessionId: "game-2", hold: false },
  ]);
  assert.deepEqual(result.plan.incident.sessionLifecycleStates, { "game-1": "active", "game-2": "scheduled" });
});

test("all clear fails closed instead of guessing open when a prior field snapshot is missing", () => {
  const incident = requirePlanned(planManualLightningHold(baseInput)).incident;
  const corrupted: WeatherSafetyIncident = {
    ...incident,
    priorFieldStates: { "field-open": "open" },
  };
  const result = planLightningAllClear({
    incident: corrupted,
    actorUserId: "gm-2",
    authorized: true,
    clearedAt: "2026-09-16T18:30:00.000Z",
  });
  assert.deepEqual(result, { ok: false, reason: "missing_prior_state" });
});

test("delivery failure is audit history only and never rolls back incident truth", () => {
  const hold = requirePlanned(planManualLightningHold(baseInput));
  const afterFailure = recordWeatherSafetyDelivery(hold.incident, {
    delivered: false,
    at: "2026-09-16T18:01:00.000Z",
    detail: "notification provider unavailable",
  });

  assert.equal(afterFailure.status, "active");
  assert.deepEqual(afterFailure.priorFieldStates, hold.incident.priorFieldStates);
  assert.deepEqual(afterFailure.affectedSessionIds, hold.incident.affectedSessionIds);
  assert.equal(afterFailure.history.at(-1)?.type, "delivery_failed");
});

test("coach/family projection returns only sessions relevant to that viewer", () => {
  const hold = requirePlanned(planManualLightningHold(baseInput));
  const view = projectWeatherSafetyForSessions(hold.incident, ["game-1", "unrelated-game"]);

  assert.ok(view);
  assert.deepEqual(view.affectedSessionIds, ["game-1"]);
  assert.equal(view.source, "manual");
  assert.equal(view.providerHealth, "offline");

  assert.equal(projectWeatherSafetyForSessions(hold.incident, ["other-game"]), null);
});

test("an already-cleared incident cannot be cleared a second time", () => {
  const incident = requirePlanned(planManualLightningHold(baseInput)).incident;
  const cleared: WeatherSafetyIncident = { ...incident, status: "cleared", clearedAt: "2026-09-16T18:30:00.000Z" };
  const result = planLightningAllClear({
    incident: cleared,
    actorUserId: "gm-2",
    authorized: true,
    clearedAt: "2026-09-16T18:45:00.000Z",
  });
  assert.deepEqual(result, { ok: false, reason: "incident_not_active" });
});
