import assert from "node:assert/strict";
import test from "node:test";
import { buildTodayTimeline, eventChangePresentation, selectTodayEvents, type TodayEvent } from "../src/lib/services/today-timeline.ts";

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
  assert.deepEqual(buildTodayTimeline([], NOW), { attention: [], now: [], next: [], later: [], completed: [] });
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

test("one valid event today is counted and always appears in a timeline section", () => {
  const events = selectTodayEvents([event({ id: "today" })], NOW, "America/Chicago");
  const result = buildTodayTimeline(events, NOW, "America/Chicago");
  assert.equal(events.length, 1);
  assert.deepEqual([...result.attention, ...result.now, ...result.next, ...result.later, ...result.completed].map((item) => item.id), ["today"]);
});

test("zero, historical, and future-day events agree with the Today empty state", () => {
  assert.equal(selectTodayEvents([], NOW, "America/Chicago").length, 0);
  assert.equal(selectTodayEvents([event({ startTime: "2026-08-31T18:00:00.000Z" })], NOW, "America/Chicago").length, 0);
  assert.equal(selectTodayEvents([event({ startTime: "2026-09-02T18:00:00.000Z" })], NOW, "America/Chicago").length, 0);
});

test("overdue scheduled, moved, delayed, cancelled, and completed events remain visible", () => {
  const result = buildTodayTimeline([
    event({ id: "overdue", startTime: at(-180) }),
    event({ id: "moved", fieldId: "field-7", fieldName: "Field 7", startTime: at(45) }),
    event({ id: "delayed", lifecycleStatus: "delayed" }),
    event({ id: "cancelled", lifecycleStatus: "cancelled" }),
    event({ id: "completed", startTime: at(-240), status: "final", lifecycleStatus: "final" }),
  ], NOW, "America/Chicago");
  assert.deepEqual(result.now.map((item) => item.id), ["overdue"]);
  assert.equal(result.next.find((item) => item.id === "moved")?.fieldName, "Field 7");
  assert.deepEqual(result.attention.map((item) => item.id), ["delayed", "cancelled"]);
  assert.deepEqual(result.completed.map((item) => item.id), ["completed"]);
});

test("venue-local day boundaries work in different zones and across DST", () => {
  const boundaryNow = Date.parse("2026-09-02T04:30:00.000Z");
  const boundaryEvent = event({ startTime: "2026-09-02T04:15:00.000Z" });
  assert.equal(selectTodayEvents([boundaryEvent], boundaryNow, "America/New_York").length, 1);
  assert.equal(selectTodayEvents([boundaryEvent], boundaryNow, "America/Chicago").length, 1);

  const springForwardNow = Date.parse("2026-03-08T08:30:00.000Z");
  const springForwardEvent = event({ startTime: "2026-03-08T07:30:00.000Z" });
  assert.equal(selectTodayEvents([springForwardEvent], springForwardNow, "America/Chicago").length, 1);

  const fallBackNow = Date.parse("2026-11-01T08:30:00.000Z");
  const firstOneThirty = event({ startTime: "2026-11-01T06:30:00.000Z" });
  const secondOneThirty = event({ id: "event-2", startTime: "2026-11-01T07:30:00.000Z" });
  assert.equal(selectTodayEvents([firstOneThirty, secondOneThirty], fallBackNow, "America/Chicago").length, 2);
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
