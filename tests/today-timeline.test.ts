import assert from "node:assert/strict";
import test from "node:test";
import { buildTodayTimeline, eventChangePresentation, type TodayEvent } from "../src/lib/services/today-timeline.ts";

const NOW = Date.parse("2026-09-01T15:00:00.000Z");
const at = (minutes: number) => new Date(NOW + minutes * 60_000).toISOString();

function event(overrides: Partial<TodayEvent> = {}): TodayEvent {
  return {
    id: "event-1",
    eventName: "A Very Long Team Name That Must Never Break the Mobile Card Layout",
    opponent: "Another Very Long Opponent Name",
    homeTeam: "Home",
    awayTeam: "Away",
    homeScore: 0,
    awayScore: 0,
    sportType: "baseball",
    fieldId: "field-1",
    fieldName: "Championship Field With A Long Sponsor Name",
    fieldStatus: "open",
    startTime: at(30),
    endTime: null,
    dateLabel: "Sep 1",
    timeLabel: "10:30 AM",
    status: "scheduled",
    lifecycleStatus: "scheduled",
    ...overrides,
  };
}

test("timeline returns useful empty sections when there are no events", () => {
  assert.deepEqual(buildTodayTimeline([], NOW), { attention: [], now: [], next: [], later: [] });
});

test("timeline sorts multiple games into now, next, and later", () => {
  const result = buildTodayTimeline([
    event({ id: "later", startTime: at(180) }),
    event({ id: "live", startTime: at(-20), status: "active", lifecycleStatus: "live" }),
    event({ id: "next-2", startTime: at(60) }),
    event({ id: "next-1", startTime: at(15) }),
  ], NOW);
  assert.deepEqual(result.now.map((item) => item.id), ["live"]);
  assert.deepEqual(result.next.map((item) => item.id), ["next-1", "next-2"]);
  assert.deepEqual(result.later.map((item) => item.id), ["later"]);
});

test("changed, cancelled, and field-blocked games are impossible to miss", () => {
  const result = buildTodayTimeline([
    event({ id: "cancelled", lifecycleStatus: "cancelled" }),
    event({ id: "delayed", lifecycleStatus: "delayed" }),
    event({ id: "closed", fieldStatus: "closed" }),
  ], NOW);
  assert.deepEqual(result.attention.map((item) => item.id), ["cancelled", "delayed", "closed"]);
  assert.equal(eventChangePresentation(result.attention[0])?.title, "GAME CANCELLED");
  assert.equal(eventChangePresentation(result.attention[1])?.title, "START DELAYED");
  assert.equal(eventChangePresentation(result.attention[2])?.title, "FIELD CLOSED");
});

test("assignment remains optional instead of manufacturing My Events data", () => {
  assert.equal(event().assignment, undefined);
  assert.equal(event({ assignment: "Scorekeeper" }).assignment, "Scorekeeper");
});
