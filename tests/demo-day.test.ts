import assert from "node:assert/strict";
import test from "node:test";
import { planDemoDay, planDemoShape } from "../src/lib/services/demo-day-core.ts";
import { minutesBehind, LATE_ATTENTION_THRESHOLD_MIN } from "../src/lib/services/command-center-core.ts";
import type { GameRecord } from "../src/lib/game-engine/game-service.ts";

const NOW = Date.parse("2026-07-18T17:00:00.000Z"); // a Saturday midday in Chicago
const ids = (n: number) => Array.from({ length: n }, (_, i) => "s" + (i + 1));

test("the shape is a believable Saturday, not all-live or all-empty", () => {
  const s = planDemoShape(18);
  assert.equal(s.finals + s.live + s.scheduled, 18, "every game gets a slot");
  assert.ok(s.finals > 0 && s.live > 0 && s.scheduled > 0, "a real day has all three");
  assert.ok(s.behind >= 1 && s.behind <= s.live, "something must need attention");
  assert.deepEqual(planDemoShape(0), { finals: 0, live: 0, behind: 0, scheduled: 0 });
});

test("every game lands on today, and each status sits on the right side of now", () => {
  const slots = planDemoDay(ids(18), NOW);
  assert.equal(slots.length, 18);

  for (const s of slots) {
    const start = Date.parse(s.startTime);
    // within today's window (not a stale seed five days ago)
    assert.ok(Math.abs(start - NOW) < 12 * 3600_000, `${s.id} should be near today`);
    if (s.status === "final") assert.ok(Date.parse(s.endTime) < NOW, "finals ended before now");
    if (s.status === "scheduled") assert.ok(start > NOW, "scheduled games start later");
    if (s.status === "active") assert.ok(start < NOW, "live games already started");
  }
});

// The whole point of the demo board: the Attention Queue must have something real.
test("the 'behind' games actually register as behind in the Command Center's own math", () => {
  const slots = planDemoDay(ids(18), NOW);
  const behind = slots.filter((s) => s.behind);
  assert.ok(behind.length >= 1, "at least one game needs attention");

  for (const s of behind) {
    const game = { status: "active", lifecycleStatus: "live", startTime: s.startTime, endTime: s.endTime } as unknown as GameRecord;
    assert.ok(
      minutesBehind(game, NOW) >= LATE_ATTENTION_THRESHOLD_MIN,
      `${s.id} must clear the Command Center's ${LATE_ATTENTION_THRESHOLD_MIN}min threshold, got ${minutesBehind(game, NOW)}`
    );
  }

  // ...and the on-time live games must NOT be flagged, or the board cries wolf.
  for (const s of slots.filter((x) => x.status === "active" && !x.behind)) {
    const game = { status: "active", lifecycleStatus: "live", startTime: s.startTime, endTime: s.endTime } as unknown as GameRecord;
    assert.ok(minutesBehind(game, NOW) < LATE_ATTENTION_THRESHOLD_MIN, `${s.id} should read on time`);
  }
});

test("small and empty schedules don't blow up", () => {
  assert.equal(planDemoDay([], NOW).length, 0);
  assert.equal(planDemoDay(ids(1), NOW).length, 1);
  assert.equal(planDemoDay(ids(3), NOW).length, 3);
});
