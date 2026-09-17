import assert from "node:assert/strict";
import test from "node:test";
import { resolveWeatherSafetyScope } from "../src/lib/services/weather-safety-scope.ts";

const base = {
  organizationId: "org-a",
  venueId: "venue-a",
  requestedFieldIds: ["field-a", "field-b"],
  requestedSessionIds: ["session-a", "session-b"],
  venue: { id: "venue-a", organizationId: "org-a" },
  fields: [
    { id: "field-a", organizationId: "org-a", venueId: "venue-a", status: "open" as const },
    { id: "field-b", organizationId: "org-a", venueId: "venue-a", status: "maintenance" as const },
  ],
  sessions: [
    { id: "session-a", organizationId: "org-a", fieldId: "field-a", status: "active" as const },
    { id: "session-b", organizationId: "org-a", fieldId: "field-b", status: "scheduled" as const },
  ],
};

test("resolves planner targets only from canonical records", () => {
  const result = resolveWeatherSafetyScope(base);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(`Expected resolved scope, got ${result.reason}`);

  assert.deepEqual(result.fields, [
    { fieldId: "field-a", organizationId: "org-a", venueId: "venue-a", status: "open" },
    { fieldId: "field-b", organizationId: "org-a", venueId: "venue-a", status: "maintenance" },
  ]);
  assert.deepEqual(result.sessions, [
    { sessionId: "session-a", organizationId: "org-a", venueId: "venue-a", fieldId: "field-a", status: "active" },
    { sessionId: "session-b", organizationId: "org-a", venueId: "venue-a", fieldId: "field-b", status: "scheduled" },
  ]);
});

test("rejects a valid venue paired with the wrong organization", () => {
  const result = resolveWeatherSafetyScope({ ...base, organizationId: "org-b" });
  assert.deepEqual(result, { ok: false, reason: "venue_org_mismatch" });
});

test("rejects a valid field from another venue", () => {
  const result = resolveWeatherSafetyScope({
    ...base,
    fields: [
      base.fields[0],
      { id: "field-b", organizationId: "org-a", venueId: "venue-b", status: "maintenance" as const },
    ],
  });
  assert.deepEqual(result, { ok: false, reason: "field_scope_mismatch" });
});

test("rejects a valid session from another tenant", () => {
  const result = resolveWeatherSafetyScope({
    ...base,
    sessions: [
      base.sessions[0],
      { id: "session-b", organizationId: "org-b", fieldId: "field-b", status: "scheduled" as const },
    ],
  });
  assert.deepEqual(result, { ok: false, reason: "session_scope_mismatch" });
});

test("rejects a session tied to a field outside the incident target set", () => {
  const result = resolveWeatherSafetyScope({
    ...base,
    sessions: [
      base.sessions[0],
      { id: "session-b", organizationId: "org-a", fieldId: "field-c", status: "scheduled" as const },
    ],
  });
  assert.deepEqual(result, { ok: false, reason: "session_scope_mismatch" });
});

test("rejects mixed-scope target arrays", () => {
  const result = resolveWeatherSafetyScope({
    ...base,
    fields: [
      base.fields[0],
      { id: "field-b", organizationId: "org-b", venueId: "venue-b", status: "maintenance" as const },
    ],
    sessions: [
      base.sessions[0],
      { id: "session-b", organizationId: "org-b", fieldId: "field-b", status: "scheduled" as const },
    ],
  });
  assert.deepEqual(result, { ok: false, reason: "field_scope_mismatch" });
});

test("fails closed when a requested target was not loaded", () => {
  const result = resolveWeatherSafetyScope({ ...base, fields: [base.fields[0]] });
  assert.deepEqual(result, { ok: false, reason: "missing_target" });
});

test("fails closed on duplicate target ids", () => {
  const result = resolveWeatherSafetyScope({
    ...base,
    requestedFieldIds: ["field-a", "field-a"],
  });
  assert.deepEqual(result, { ok: false, reason: "duplicate_target" });
});
