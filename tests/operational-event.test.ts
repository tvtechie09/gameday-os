import assert from "node:assert/strict";
import test from "node:test";
import { canonicalExternalEventKey, classifyScheduleImport } from "../src/lib/operational-event.ts";

const existing = {
  id: "session-1",
  externalSource: "SportsEngine",
  externalSourceId: "event-42",
  externalSourceUrl: "https://sports.example/events/42",
  fieldId: "field-1",
  title: "Falcons vs Bears",
  sportType: "baseball" as const,
  homeTeam: "Falcons",
  awayTeam: "Bears",
  startTime: "2026-09-01T18:00:00.000Z",
  endTime: "2026-09-01T20:00:00.000Z",
  notes: "League game",
};

const candidate = {
  externalSource: "SportsEngine",
  externalSourceId: "event-42",
  externalSourceUrl: "https://sports.example/events/42",
  fieldId: "field-1",
  title: "Falcons vs Bears",
  sportType: "baseball" as const,
  homeTeam: "Falcons",
  awayTeam: "Bears",
  startTime: "2026-09-01T18:00:00Z",
  endTime: "2026-09-01T20:00:00Z",
  notes: "League game",
};

test("new source identities create canonical events", () => {
  assert.deepEqual(classifyScheduleImport({ ...candidate, externalSourceId: "event-99", externalSourceUrl: "https://sports.example/events/99" }, [existing]), {
    action: "create",
    changedFields: [],
    existingSessionId: null,
  });
});

test("unchanged source events are idempotent", () => {
  assert.deepEqual(classifyScheduleImport(candidate, [existing]), {
    action: "unchanged",
    changedFields: [],
    existingSessionId: "session-1",
  });
});

test("reschedules become explicit updates with a human-readable diff", () => {
  assert.deepEqual(classifyScheduleImport({ ...candidate, fieldId: "field-2", startTime: "2026-09-01T19:00:00Z" }, [existing]), {
    action: "update",
    changedFields: ["field", "start time"],
    existingSessionId: "session-1",
  });
});

test("ambiguous external identities stop for recovery instead of guessing", () => {
  const result = classifyScheduleImport(candidate, [existing, { ...existing, id: "session-2" }]);
  assert.equal(result.action, "conflict");
  assert.match(result.action === "conflict" ? result.reason : "", /more than one/i);
});

test("a reused source URL with a different ID is a conflict, not a silent reassignment", () => {
  const result = classifyScheduleImport({ ...candidate, externalSourceId: "replacement-id" }, [existing]);
  assert.equal(result.action, "conflict");
  assert.match(result.action === "conflict" ? result.reason : "", /different external event ID/i);
});

test("external identity keys normalize provider names but preserve provider IDs", () => {
  assert.equal(canonicalExternalEventKey(" SportsEngine ", " Event-42 "), "sportsengine|Event-42");
});
