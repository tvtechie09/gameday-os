import assert from "node:assert/strict";
import test from "node:test";
import { buildEndOfDayReport, ON_TIME_GRACE_MIN } from "../src/lib/services/end-of-day-core.ts";
import type { GameRecord } from "../src/lib/game-engine/game-service.ts";
import type { WorkOrder } from "../src/lib/services/work-orders.ts";
import type { Field, VenueAsset } from "../src/lib/types.ts";

// 2026-07-25 18:00Z == 1:00 PM Chicago, so "today" at the venue is 2026-07-25.
const NOW = Date.parse("2026-07-25T18:00:00.000Z");
const DATE = "2026-07-25";
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

function game(overrides: Partial<GameRecord>): GameRecord {
  return {
    id: "g1",
    fieldId: "F1",
    title: "",
    homeTeam: "Home",
    awayTeam: "Away",
    homeScore: 0,
    awayScore: 0,
    startTime: minsAgo(180),
    endTime: null,
    status: "final",
    lifecycleStatus: "final",
    sportType: "baseball",
    ...overrides,
  } as unknown as GameRecord;
}

function field(id: string, name: string, status = "open"): Field {
  return { id, name, status, venueId: "V1" } as unknown as Field;
}

function order(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: "w1",
    venueId: "V1",
    fieldId: "F1",
    title: "Sprinkler head",
    detail: null,
    priority: "normal",
    status: "open",
    reportedBy: null,
    createdAt: minsAgo(120),
    closedAt: null,
    assignedRole: null,
    assignedToUserId: null,
    acknowledgedAt: null,
    acknowledgedBy: null,
    dueAt: null,
    resolutionNotes: null,
    source: "manual",
    gameId: null,
    assetId: null,
    issueType: "maintenance",
    systemKey: null,
    detectedAt: minsAgo(120),
    assignedAt: null,
    startedAt: null,
    metadata: {},
    ...overrides,
  };
}

const base = {
  venueName: "Crossroads",
  date: DATE,
  fields: [field("F1", "Field 1")],
  workOrders: [] as WorkOrder[],
  assets: [] as VenueAsset[],
  now: NOW,
};

// ---- game counts -----------------------------------------------------------

test("counts completed, cancelled, postponed, and flags unfinished games", () => {
  const report = buildEndOfDayReport({
    ...base,
    games: [
      game({ id: "a", lifecycleStatus: "final", status: "final" }),
      game({ id: "b", lifecycleStatus: "archived", status: "final" }),
      game({ id: "c", lifecycleStatus: "cancelled", status: "scheduled" }),
      game({ id: "d", lifecycleStatus: "postponed", status: "scheduled" }),
      // Never finished and never formally cancelled -> the anomaly.
      game({ id: "e", lifecycleStatus: "live", status: "active" }),
    ],
  });

  assert.equal(report.games.scheduled, 5);
  assert.equal(report.games.completed, 2);
  assert.equal(report.games.cancelled, 1);
  assert.equal(report.games.postponed, 1);
  assert.equal(report.games.unfinished, 1);
  assert.equal(report.carryOver.unfinishedGames.length, 1);
  assert.equal(report.carryOver.unfinishedGames[0].id, "e");
  assert.ok(report.notes.some((n) => /never reached a final/.test(n)));
});

// ---- schedule performance --------------------------------------------------

test("start delay is measured against the ACTUAL first pitch, not the slot", () => {
  const games = [
    game({ id: "ontime", fieldId: "F1", startTime: minsAgo(180) }),
    game({ id: "late", fieldId: "F2", startTime: minsAgo(180) }),
  ];
  const actuals = new Map([
    // started 2 min after the slot -> within grace
    ["ontime", { startedAt: minsAgo(178), finalAt: minsAgo(90) }],
    // started 40 min after the slot
    ["late", { startedAt: minsAgo(140), finalAt: minsAgo(40) }],
  ]);
  const report = buildEndOfDayReport({ ...base, fields: [field("F1", "Field 1"), field("F2", "Field 2")], games, actuals });

  assert.equal(report.schedule.measured, 2);
  assert.equal(report.schedule.unmeasured, 0);
  assert.equal(report.schedule.startedOnTime, 1);
  assert.equal(report.schedule.startedLate, 1);
  assert.equal(report.schedule.worstStartDelayMin, 40);
  assert.equal(report.schedule.worstStartField, "Field 2");
  assert.equal(report.schedule.averageStartDelayMin, 21); // (2 + 40) / 2
  assert.ok(ON_TIME_GRACE_MIN >= 2);
});

test("games with no recorded first pitch are UNMEASURED, never assumed on time", () => {
  const report = buildEndOfDayReport({
    ...base,
    games: [game({ id: "a" }), game({ id: "b" })],
    actuals: new Map([["a", { startedAt: minsAgo(175), finalAt: null }]]),
  });

  assert.equal(report.schedule.measured, 1);
  assert.equal(report.schedule.unmeasured, 1);
  // The unmeasured game must NOT inflate the on-time count.
  assert.equal(report.schedule.startedOnTime, 1);
  assert.ok(report.notes.some((n) => /no recorded first pitch/.test(n)));
});

test("no ledger data at all reports everything unmeasured with zeroed stats", () => {
  const report = buildEndOfDayReport({ ...base, games: [game({ id: "a" }), game({ id: "b" })] });
  assert.equal(report.schedule.measured, 0);
  assert.equal(report.schedule.unmeasured, 2);
  assert.equal(report.schedule.averageStartDelayMin, 0);
  assert.equal(report.schedule.worstStartField, null);
});

test("cancelled and postponed games are excluded from start-time measurement", () => {
  const report = buildEndOfDayReport({
    ...base,
    games: [game({ id: "x", lifecycleStatus: "cancelled" }), game({ id: "y", lifecycleStatus: "postponed" })],
  });
  // Nothing playable, so nothing unmeasured either — a cancelled game has no
  // start to judge and must not read as a data gap.
  assert.equal(report.schedule.unmeasured, 0);
  assert.equal(report.schedule.measured, 0);
});

// ---- issues ----------------------------------------------------------------

test("issue counts split today's activity from what carries over", () => {
  const report = buildEndOfDayReport({
    ...base,
    games: [],
    workOrders: [
      order({ id: "opened-today", createdAt: minsAgo(60) }),
      order({ id: "closed-today", createdAt: minsAgo(300), status: "done", closedAt: minsAgo(30) }),
      order({ id: "carry-over", createdAt: minsAgo(2000), assignedRole: "grounds" }),
      order({ id: "overdue", createdAt: minsAgo(500), dueAt: minsAgo(20) }),
    ],
  });

  // Three were created today (60, 300 and 500 minutes ago are all the same
  // venue day); only "carry-over" at 2000 minutes back is yesterday's.
  assert.equal(report.issues.openedToday, 3);
  assert.equal(report.issues.resolvedToday, 1);
  assert.equal(report.issues.stillOpen, 3); // all but the resolved one
  assert.equal(report.issues.overdue, 1);
  assert.equal(report.issues.unowned, 2); // opened-today + overdue (carry-over has a role)
  assert.equal(report.carryOver.openIssues.length, 3);
  assert.ok(report.notes.some((n) => /carry into tomorrow/.test(n)));
});

test("a resolved issue is not carried over", () => {
  const report = buildEndOfDayReport({
    ...base,
    games: [],
    workOrders: [order({ id: "done", status: "done", closedAt: minsAgo(10) })],
  });
  assert.equal(report.issues.stillOpen, 0);
  assert.deepEqual(report.carryOver.openIssues, []);
});

// ---- carry-over ------------------------------------------------------------

test("flagged fields and device health carry into tomorrow", () => {
  const report = buildEndOfDayReport({
    ...base,
    games: [],
    fields: [field("F1", "Field 1"), field("F2", "Field 2", "closed"), field("F3", "Field 3", "maintenance")],
    assets: [
      { id: "a1", venueId: "V1", status: "offline" } as unknown as VenueAsset,
      { id: "a2", venueId: "V1", status: "unknown" } as unknown as VenueAsset,
      { id: "a3", venueId: "V1", status: "healthy" } as unknown as VenueAsset,
    ],
  });

  assert.deepEqual(report.carryOver.flaggedFields.map((f) => f.name), ["Field 2", "Field 3"]);
  assert.equal(report.carryOver.devicesOffline, 1);
  assert.equal(report.carryOver.devicesUnknown, 1);
  assert.ok(report.notes.some((n) => /still flagged/.test(n)));
  // "unknown" must never be reported as healthy.
  assert.ok(report.notes.some((n) => /never reported/.test(n)));
});

// ---- clean close -----------------------------------------------------------

test("a clean day says so instead of listing nothing", () => {
  const report = buildEndOfDayReport({
    ...base,
    games: [game({ id: "a", lifecycleStatus: "final" })],
    actuals: new Map([["a", { startedAt: minsAgo(180), finalAt: minsAgo(90) }]]),
  });
  assert.equal(report.games.unfinished, 0);
  assert.equal(report.issues.stillOpen, 0);
  assert.deepEqual(report.notes, ["Clean close: every game finished, no issues carried over, no fields flagged."]);
});

test("report carries venue, date, and a generation timestamp", () => {
  const report = buildEndOfDayReport({ ...base, games: [] });
  assert.equal(report.venueName, "Crossroads");
  assert.equal(report.date, DATE);
  assert.equal(report.generatedAt, new Date(NOW).toISOString());
});
