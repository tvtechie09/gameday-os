import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  GAME_LIFECYCLE_STATUSES,
  assertTransition,
  canTransition,
  eventTypeForTransition,
  isGameLifecycleStatus,
  legacyStatusFor,
  lifecycleFromLegacy,
} from "../src/lib/game-engine/game-lifecycle.ts";
import { integrationIdempotencyKey, normalizeEventInput, scorekeeperIdempotencyKey } from "../src/lib/game-engine/game-events.ts";

// ---- Lifecycle state machine -------------------------------------------------

test("happy path: scheduled → live → final → archived", () => {
  assert.equal(canTransition("scheduled", "live"), true);
  assert.equal(canTransition("live", "final"), true);
  assert.equal(canTransition("final", "archived"), true);
});

test("prohibited transitions are rejected", () => {
  assert.equal(canTransition("final", "live"), false);       // no un-finishing
  assert.equal(canTransition("archived", "scheduled"), false); // terminal
  assert.equal(canTransition("cancelled", "live"), false);
  assert.equal(canTransition("draft", "live"), false);        // must schedule first
  assert.equal(canTransition("live", "live"), false);         // self-loop
  assert.throws(() => assertTransition("final", "live"), /Illegal game lifecycle transition/);
});

test("weather flow: live → delayed → live, and suspended → final", () => {
  assert.equal(canTransition("live", "delayed"), true);
  assert.equal(canTransition("delayed", "live"), true);
  assert.equal(canTransition("live", "suspended"), true);
  assert.equal(canTransition("suspended", "final"), true);
  assert.equal(canTransition("postponed", "scheduled"), true); // rescheduled
});

test("every lifecycle status maps to a legacy status (no consumer breaks)", () => {
  for (const status of GAME_LIFECYCLE_STATUSES) {
    assert.ok(["scheduled", "active", "final"].includes(legacyStatusFor(status)), status);
  }
  assert.equal(legacyStatusFor("live"), "active");
  assert.equal(legacyStatusFor("suspended"), "active");
  assert.equal(legacyStatusFor("cancelled"), "final");
  assert.equal(legacyStatusFor("check_in"), "scheduled");
});

test("legacy statuses promote to lifecycle statuses", () => {
  assert.equal(lifecycleFromLegacy("active"), "live");
  assert.equal(lifecycleFromLegacy("final"), "final");
  assert.equal(lifecycleFromLegacy("scheduled"), "scheduled");
  assert.equal(lifecycleFromLegacy("garbage"), "scheduled");
});

test("transitions emit the right ledger event types", () => {
  assert.equal(eventTypeForTransition("live"), "game.started");
  assert.equal(eventTypeForTransition("delayed"), "game.delayed");
  assert.equal(eventTypeForTransition("final"), "game.completed");
  assert.equal(eventTypeForTransition("ready"), "game.lifecycle_changed");
});

test("status value guard matches the constrained set", () => {
  assert.equal(isGameLifecycleStatus("live"), true);
  assert.equal(isGameLifecycleStatus("bogus"), false);
});

// ---- Event model ---------------------------------------------------------------

test("idempotency keys are deterministic per producer occurrence", () => {
  assert.equal(scorekeeperIdempotencyKey("tok", 7), "scorekeeper:tok:7");
  assert.equal(scorekeeperIdempotencyKey("tok", 7), scorekeeperIdempotencyKey("tok", 7));
  assert.notEqual(scorekeeperIdempotencyKey("tok", 7), scorekeeperIdempotencyKey("tok", 8));
  assert.equal(integrationIdempotencyKey("gamechanger", "e1"), "integration:gamechanger:e1");
});

test("normalizeEventInput fills defaults without clobbering provided values", () => {
  const normalized = normalizeEventInput({
    gameId: "g1",
    organizationId: "org1",
    eventType: "score.changed",
    actorType: "scorekeeper",
    payload: { home: 3 },
  });
  assert.equal(normalized.eventVersion, 1);
  assert.equal(normalized.sourceType, "venue-app");
  assert.deepEqual(normalized.payload, { home: 3 });
  assert.equal(normalized.idempotencyKey, null);
  assert.ok(!Number.isNaN(Date.parse(normalized.occurredAt)));
});

// ---- Migration contract (tenant isolation + authorization + append-only) -------
// The migration is generated but not applied; these tests pin its security
// posture so review failures are loud.

const migration = readFileSync(new URL("../supabase/migrations/20260713040000_connected_game_engine.sql", import.meta.url), "utf8");

test("migration enforces RLS on both new tables", () => {
  assert.ok(migration.includes("alter table public.game_live_state enable row level security"));
  assert.ok(migration.includes("alter table public.game_events enable row level security"));
});

test("migration keeps the event ledger non-public and the RPC locked down", () => {
  // game_events: RLS enabled with NO select policy (service-role only).
  assert.ok(!/create policy [^;]*on public\.game_events/.test(migration), "no public policy on game_events");
  assert.ok(migration.includes("revoke all on function public.game_engine_apply from public, anon, authenticated"));
});

test("migration carries tenant + idempotency + external-id uniqueness", () => {
  assert.ok(migration.includes("organization_id"), "tenant column present");
  assert.ok(migration.includes("game_events_idempotency_unique"));
  assert.ok(migration.includes("on public.game_events (game_id, idempotency_key)"));
  assert.ok(migration.includes("sessions_external_source_unique"));
  assert.ok(migration.includes("sessions_lifecycle_status_check"));
});

test("migration is additive: no drops or renames of existing tables", () => {
  assert.ok(!/drop table/i.test(migration));
  assert.ok(!/alter table [^;]*rename/i.test(migration));
});
