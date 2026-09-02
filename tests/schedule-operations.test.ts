import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applyScheduleChanges,
  findScheduleConflicts,
  planDelay,
  planDelayRemaining,
  planFieldSwap,
  planLifecycleChange,
  planSingleGameMove,
} from "../src/lib/services/schedule-operations-core.ts";
import type { Session } from "../src/lib/types.ts";

const at = (hour: number, minute = 0) => new Date(Date.UTC(2026, 7, 30, hour, minute)).toISOString();
const session = (id: string, fieldId: string, start: string, end: string, overrides: Partial<Session> = {}) => ({
  id, fieldId, title: id, homeTeam: "Home", awayTeam: "Away", startTime: start, endTime: end,
  status: "scheduled", lifecycleStatus: "scheduled", ...overrides,
} as unknown as Session);

test("conflict detection permits adjacent slots and rejects overlap on the same field", () => {
  const first = session("one", "F1", at(14), at(15, 30));
  const adjacent = session("two", "F1", at(15, 30), at(17));
  assert.equal(findScheduleConflicts([first, adjacent]).length, 0);
  const overlap = session("three", "F1", at(15), at(16, 30));
  assert.equal(findScheduleConflicts([first, overlap]).length, 1);
});

test("moving a game previews a target-field conflict before mutation", () => {
  const moving = session("moving", "F1", at(14), at(15, 30));
  const occupied = session("occupied", "F2", at(14, 30), at(16));
  const change = planSingleGameMove(moving, { fieldId: "F2", reason: "Move" });
  assert.match(findScheduleConflicts([moving, occupied], [change])[0].message, /overlaps/);
});

test("delay one game preserves duration and delay remaining shifts only the affected tail", () => {
  const first = session("one", "F1", at(14), at(15, 30));
  const second = session("two", "F1", at(16), at(17, 30));
  const other = session("other", "F2", at(16), at(17, 30));
  assert.equal(planDelay(first, 30).endTime, at(16));
  const tail = planDelayRemaining([first, second, other], "F1", at(15), 30);
  assert.deepEqual(tail.map((change) => change.sessionId), ["two"]);
  assert.equal(tail[0].startTime, at(16, 30));
});

test("field swap is planned together and cancelled/postponed games stop conflicting", () => {
  const first = session("one", "F1", at(14), at(15, 30));
  const second = session("two", "F2", at(16), at(17, 30));
  const swap = planFieldSwap(first, second);
  assert.deepEqual(swap.map((change) => change.fieldId), ["F2", "F1"]);
  const cancelled = planLifecycleChange(first, "cancelled");
  const projected = applyScheduleChanges([first, session("overlap", "F1", at(14), at(15))], [cancelled]);
  assert.equal(findScheduleConflicts(projected).length, 0);
});

test("schedule operation migration is atomic, venue-scoped, and provider-neutral", () => {
  const migration = readFileSync("supabase/migrations/20260831022455_schedule_operations_outbox.sql", "utf8");
  assert.match(migration, /create table if not exists public\.schedule_change_outbox/);
  assert.match(migration, /external_source text/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /old_field\.venue_id = p_venue_id/);
  assert.match(migration, /new_field\.venue_id = p_venue_id/);
  assert.match(migration, /Schedule conflict detected; no changes were applied/);
  assert.match(migration, /revoke all on public\.schedule_change_outbox from anon, authenticated/);
  assert.match(migration, /revoke all on function public\.apply_schedule_operation[^;]+from public, anon, authenticated/);
});

test("rapid schedule server action keeps capability and object-scope guards", () => {
  const actions = readFileSync("src/app/admin/command-center/actions.ts", "utf8");
  const service = readFileSync("src/lib/services/schedule-operations.ts", "utf8");
  assert.match(actions, /requireCommandCenter\(\)/);
  assert.match(actions, /assertFieldInScope\(targetFieldId\)/);
  assert.match(service, /requirePermission\(actorUserId, "venue\.field\.manage"/);
  assert.match(service, /Schedule operations cannot cross venue boundaries/);
  assert.match(service, /original_field_id/);
  assert.match(service, /new_field_id/);
  assert.match(service, /original_start_time/);
  assert.match(service, /new_start_time/);
});
