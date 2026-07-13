import assert from "node:assert/strict";
import test from "node:test";
import { computeQuickActionTargets, labelFor } from "../src/lib/services/quick-action-targets.ts";
import type { Field, Session, Venue } from "../src/lib/types.ts";

const NOW = new Date("2026-07-13T18:00:00.000Z").getTime();
const venue = { id: "v1", name: "Test Venue" } as Venue;
const fields = [
  { id: "f1", name: "Field 1", status: "open" },
  { id: "f2", name: "Field 2", status: "delayed" },
] as Field[];

function session(over: Partial<Session>): Session {
  return { id: "s", fieldId: "f1", status: "scheduled", startTime: new Date(NOW).toISOString(), title: "", homeTeam: "Home", awayTeam: "Away", ...over } as Session;
}

test("labelFor prefers title, falls back to matchup", () => {
  assert.equal(labelFor({ title: "Championship", homeTeam: "A", awayTeam: "B" }), "Championship");
  assert.equal(labelFor({ title: "", homeTeam: "A", awayTeam: "B" }), "A vs B");
});

test("startGame is the soonest scheduled game inside the window", () => {
  const sessions = [
    session({ id: "past", startTime: new Date(NOW - 3 * 60 * 60 * 1000).toISOString() }), // >2h ago, excluded
    session({ id: "soon", fieldId: "f2", startTime: new Date(NOW + 30 * 60 * 1000).toISOString() }),
    session({ id: "tomorrow", startTime: new Date(NOW + 20 * 60 * 60 * 1000).toISOString() }), // >12h out, excluded
  ];
  const t = computeQuickActionTargets(venue, fields, sessions, NOW);
  assert.equal(t.startGame?.sessionId, "soon");
  assert.equal(t.startGame?.fieldName, "Field 2");
});

test("delayGame prefers the live game over the next scheduled", () => {
  const sessions = [
    session({ id: "sched", startTime: new Date(NOW + 60 * 60 * 1000).toISOString() }),
    session({ id: "livegame", status: "active", fieldId: "f2" }),
  ];
  const t = computeQuickActionTargets(venue, fields, sessions, NOW);
  assert.equal(t.delayGame?.sessionId, "livegame");
  assert.equal(t.delayGame?.fieldId, "f2");
});

test("delayGame falls back to the startable game when nothing is live", () => {
  const sessions = [session({ id: "sched", startTime: new Date(NOW + 60 * 60 * 1000).toISOString() })];
  const t = computeQuickActionTargets(venue, fields, sessions, NOW);
  assert.equal(t.delayGame?.sessionId, "sched");
});

test("no startable/live game yields null targets but still lists fields", () => {
  const sessions = [session({ id: "final", status: "final" })];
  const t = computeQuickActionTargets(venue, fields, sessions, NOW);
  assert.equal(t.startGame, null);
  assert.equal(t.delayGame, null);
  assert.equal(t.fields.length, 2);
});
