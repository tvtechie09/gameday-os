import assert from "node:assert/strict";
import test from "node:test";
import { buildImpactReport, impactHeadlines, type ImpactInput } from "../src/lib/services/venue-impact-core.ts";
import type { GameRecord } from "../src/lib/game-engine/game-service.ts";
import type { WorkOrder } from "../src/lib/services/work-orders.ts";

const NOW = Date.parse("2026-07-14T18:00:00.000Z");
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();
const minsAhead = (m: number) => new Date(NOW + m * 60_000).toISOString();

function game(over: Partial<GameRecord>): GameRecord {
  return {
    id: "g" + Math.random(), fieldId: "F1", title: "", homeTeam: "H", awayTeam: "A",
    homeScore: 0, awayScore: 0, startTime: minsAgo(60), endTime: null,
    status: "scheduled", lifecycleStatus: "scheduled", sportType: "baseball", ...over,
  } as unknown as GameRecord;
}
const workOrder = (over: Partial<WorkOrder>): WorkOrder =>
  ({ id: "w" + Math.random(), fieldId: "F1", title: "t", detail: null, priority: "normal", status: "open", closedAt: null, ...over } as unknown as WorkOrder);

const input = (over: Partial<ImpactInput> = {}): ImpactInput => ({
  games: [], alertsPosted: 0, familiesNotified: 0, weatherHolds: 0, workOrders: [],
  sponsorPlacementsDelivered: 0, sponsorContracted: 0, engineEventsRecorded: 0, now: NOW, ...over,
});

test("on-time rate counts only games that actually started", () => {
  const r = buildImpactReport(input({
    games: [
      game({ status: "final", startTime: minsAgo(200), endTime: minsAgo(110) }), // done, on time
      game({ status: "active", lifecycleStatus: "live", startTime: minsAgo(30), endTime: minsAhead(60) }), // live, on time
      game({ status: "active", lifecycleStatus: "live", startTime: minsAgo(200), endTime: minsAgo(45) }), // 45 behind
      game({ status: "scheduled", startTime: minsAhead(120) }), // never started — excluded entirely
    ],
  }));
  assert.equal(r.gamesRun, 3);        // the scheduled one doesn't count as "run"
  assert.equal(r.gamesBehind, 1);
  assert.equal(r.gamesOnTime, 2);
  assert.equal(Math.round(r.onTimeRate * 100), 67);
  assert.equal(r.gamesCompleted, 1);
});

test("a scheduled-but-never-played day is not a 100% on-time win", () => {
  const r = buildImpactReport(input({ games: [game({ status: "scheduled" })] }));
  assert.equal(r.gamesRun, 0);
  assert.equal(r.onTimeRate, 0); // no games run => no credit claimed
});

test("recorded first pitch drives retrospective on-time claims when lifecycle history is available", () => {
  const early = game({ id: "early", status: "final", startTime: minsAgo(200) });
  const late = game({ id: "late", status: "final", startTime: minsAgo(200) });
  const unmeasured = game({ id: "unmeasured", status: "final", startTime: minsAgo(200) });
  const r = buildImpactReport(input({
    games: [early, late, unmeasured],
    actuals: new Map([
      ["early", { startedAt: minsAgo(198), finalAt: minsAgo(100) }],
      ["late", { startedAt: minsAgo(180), finalAt: minsAgo(80) }],
    ]),
  }));
  assert.equal(r.gamesRun, 2);
  assert.equal(r.gamesBehind, 1);
  assert.equal(r.gamesOnTime, 1);
});

test("sponsor delivery rate is capped and never divides by zero", () => {
  const over = buildImpactReport(input({ sponsorPlacementsDelivered: 400, sponsorContracted: 324 }));
  assert.equal(over.sponsorDeliveryRate, 1); // over-delivery caps at 100%

  const none = buildImpactReport(input({ sponsorPlacementsDelivered: 12, sponsorContracted: 0 }));
  assert.equal(none.sponsorDeliveryRate, 0); // nothing contracted => no rate claimed
});

test("work order close rate and automated actions are simple counted sums", () => {
  const r = buildImpactReport(input({
    workOrders: [workOrder({ status: "done" }), workOrder({ closedAt: "2026-07-14T00:00:00Z" }), workOrder({ status: "open" })],
    engineEventsRecorded: 100, sponsorPlacementsDelivered: 54, familiesNotified: 30,
  }));
  assert.equal(r.workOrdersOpened, 3);
  assert.equal(r.workOrdersClosed, 2);
  assert.equal(Math.round(r.workOrderCloseRate * 100), 67);
  assert.equal(r.automatedActions, 184); // 100 + 54 + 30, nothing modelled
});

test("headlines only claim what was actually measured", () => {
  const empty = impactHeadlines(buildImpactReport(input()));
  assert.deepEqual(empty, [], "a venue with no activity gets no claims");

  const real = impactHeadlines(buildImpactReport(input({
    games: [game({ status: "final", startTime: minsAgo(200), endTime: minsAgo(110) })],
    familiesNotified: 412, weatherHolds: 2,
    sponsorPlacementsDelivered: 54, sponsorContracted: 324,
    engineEventsRecorded: 10,
  })));
  assert.ok(real.some((h) => /1 games run · 100% started on time/.test(h)));
  assert.ok(real.some((h) => /412 families reached/.test(h)));
  assert.ok(real.some((h) => /2 weather holds/.test(h)));
  assert.ok(real.some((h) => /54 of 324 contracted sponsor placements/.test(h)));
});
