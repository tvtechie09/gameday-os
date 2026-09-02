import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { projectFieldSessions } from "../src/lib/services/session-projection-core.ts";
import type { Session } from "../src/lib/types.ts";

const now = Date.parse("2026-07-11T16:00:00.000Z");
const session = (id: string, fieldId: string, startTime: string, overrides: Partial<Session> = {}): Session => ({
  id,
  fieldId,
  title: id,
  homeTeam: "Home",
  awayTeam: "Away",
  startTime,
  endTime: null,
  status: "scheduled",
  lifecycleStatus: "scheduled",
  ...overrides,
} as Session);

test("projection excludes historical and cancelled rows from Next Game", () => {
  const projection = projectFieldSessions({
    sessions: [
      session("historical", "f1", "2026-07-10T17:00:00.000Z"),
      session("cancelled", "f1", "2026-07-11T17:00:00.000Z", { lifecycleStatus: "cancelled" }),
      session("future", "f1", "2026-07-11T18:00:00.000Z"),
    ],
    now,
    timeZone: "America/Chicago",
  });
  assert.equal(projection.current, null);
  assert.equal(projection.next?.id, "future");
  assert.deepEqual(projection.today.map((game) => game.id), ["cancelled", "future"]);
});

test("moved game projects only on its new field and empty fields remain empty", () => {
  const moved = session("moved", "new-field", "2026-07-11T18:00:00.000Z");
  const oldProjection = projectFieldSessions({ sessions: [moved].filter((game) => game.fieldId === "old-field"), now, timeZone: "America/Chicago" });
  const newProjection = projectFieldSessions({ sessions: [moved].filter((game) => game.fieldId === "new-field"), now, timeZone: "America/Chicago" });
  assert.equal(oldProjection.next, null);
  assert.equal(newProjection.next?.id, "moved");
  assert.equal(projectFieldSessions({ sessions: [], now, timeZone: "America/Chicago" }).next, null);
});

test("current projection follows lifecycle and venue-day semantics", () => {
  const projection = projectFieldSessions({
    sessions: [
      session("stale-live", "f1", "2026-07-10T15:00:00.000Z", { status: "active", lifecycleStatus: "live" }),
      session("live", "f1", "2026-07-11T15:00:00.000Z", { status: "active", lifecycleStatus: "live" }),
    ],
    now,
    timeZone: "America/Chicago",
  });
  assert.equal(projection.current?.id, "live");
  assert.equal(projection.next, null);
});

test("current prefers explicit live state, then the most recent overdue scheduled game", () => {
  const withLive = projectFieldSessions({
    sessions: [
      session("old-overdue", "f1", "2026-07-11T13:00:00.000Z"),
      session("live", "f1", "2026-07-11T14:00:00.000Z", { status: "active", lifecycleStatus: "live" }),
      session("recent-overdue", "f1", "2026-07-11T15:30:00.000Z"),
    ],
    now,
    timeZone: "America/Chicago",
  });
  assert.equal(withLive.current?.id, "live");

  const withoutLive = projectFieldSessions({
    sessions: withLive.today.filter((game) => game.id !== "live"),
    now,
    timeZone: "America/Chicago",
  });
  assert.equal(withoutLive.current?.id, "recent-overdue");
});

test("internal and public field surfaces consume the shared projection", () => {
  for (const path of [
    "src/lib/services/field-operations-core.ts",
    "src/lib/services/command-center-core.ts",
    "src/app/fields/[fieldId]/page.tsx",
    "src/app/venues/[venueId]/page.tsx",
    "src/lib/services/venue-display.ts",
    "src/lib/services/scoreboard-display.ts",
  ]) {
    assert.match(readFileSync(path, "utf8"), /projectFieldSessions/, path);
  }
  const publicFieldPage = readFileSync("src/app/fields/[fieldId]/page.tsx", "utf8");
  assert.doesNotMatch(publicFieldPage, /sessions\.find\(\(session\) => session\.status === "final"\)/);
});
