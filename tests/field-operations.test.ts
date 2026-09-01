import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildFieldOperationItems,
  fieldOperationMatchesFilter,
  fieldOperationMatchesQuery,
  summarizeFieldOperations,
} from "../src/lib/services/field-operations-core.ts";
import type { Field, Session, Venue } from "../src/lib/types.ts";
import type { WorkOrder } from "../src/lib/services/work-orders.ts";

const now = Date.parse("2026-07-11T16:00:00.000Z");
const venue = {
  id: "v1",
  name: "Wintrust Crossroads Sports Complex",
  timezone: "America/Chicago",
} as Venue;

function field(name: string, status: Field["status"] = "open"): Field {
  return {
    id: `field-${name.replaceAll(" ", "-").toLowerCase()}`,
    venueId: venue.id,
    name,
    sportType: "baseball",
    mapLabel: name.replace("Field ", "Baseball "),
    status,
    updatedAt: "2026-07-11T15:55:00.000Z",
  } as Field;
}

function game(input: { id: string; fieldId: string; startTime: string; status?: Session["status"]; lifecycleStatus?: Session["lifecycleStatus"]; home?: string; away?: string }): Session {
  return {
    id: input.id,
    fieldId: input.fieldId,
    title: "",
    homeTeam: input.home ?? "Sparks 12U",
    awayTeam: input.away ?? "Bulldogs 12U",
    startTime: input.startTime,
    endTime: null,
    status: input.status ?? "scheduled",
    lifecycleStatus: input.lifecycleStatus ?? "scheduled",
    homeScore: 0,
    awayScore: 0,
    sportType: "baseball",
  } as Session;
}

function issue(fieldId: string): WorkOrder {
  return {
    id: "issue-1",
    venueId: venue.id,
    fieldId,
    title: "Standing water near first base",
    priority: "urgent",
    status: "open",
    createdAt: "2026-07-11T15:00:00.000Z",
    closedAt: null,
  } as WorkOrder;
}

test("31-field board preserves natural physical order", () => {
  const fields = Array.from({ length: 31 }, (_, index) => field(`Field ${31 - index}`));
  const items = buildFieldOperationItems({ venue, fields, sessions: [], workOrders: [], now });
  assert.equal(items.length, 31);
  assert.deepEqual(items.slice(0, 4).map((item) => item.fieldName), ["Field 1", "Field 2", "Field 3", "Field 4"]);
  assert.equal(items.at(-1)?.fieldName, "Field 31");
});

test("field operation model exposes current, next, issue, and closure impact", () => {
  const target = field("Field 9", "closed");
  const sessions = [
    game({ id: "live", fieldId: target.id, startTime: "2026-07-11T15:00:00.000Z", status: "active", lifecycleStatus: "live" }),
    game({ id: "next", fieldId: target.id, startTime: "2026-07-11T17:30:00.000Z", home: "Chargers", away: "Bears" }),
    game({ id: "later", fieldId: target.id, startTime: "2026-07-11T20:00:00.000Z" }),
  ];
  const [item] = buildFieldOperationItems({ venue, fields: [target], sessions, workOrders: [issue(target.id)], now });
  assert.equal(item.currentGame?.id, "live");
  assert.equal(item.nextGame?.id, "next");
  assert.equal(item.activeIssue?.title, "Standing water near first base");
  assert.equal(item.upcomingGameCount, 2);
  assert.equal(item.affectedUpcomingGames, 2);
  assert.equal(item.needsAttention, true);
});

test("historical scheduled rows never appear as today's current games", () => {
  const target = field("Field 4");
  const [item] = buildFieldOperationItems({
    venue,
    fields: [target],
    sessions: [game({ id: "stale", fieldId: target.id, startTime: "2026-07-10T15:00:00.000Z" })],
    workOrders: [],
    now,
  });
  assert.equal(item.currentGame, null);
  assert.equal(item.nextGame, null);
  assert.equal(item.needsAttention, false);
});

test("attention, active, and closed filters use operational signals", () => {
  const activeField = field("Field 1", "active");
  const delayedField = field("Field 2", "delayed");
  const maintenanceField = field("Field 3", "maintenance");
  const items = buildFieldOperationItems({ venue, fields: [activeField, delayedField, maintenanceField], sessions: [], workOrders: [], now });
  assert.deepEqual(items.filter((item) => fieldOperationMatchesFilter(item, "active")).map((item) => item.fieldName), ["Field 1"]);
  assert.deepEqual(items.filter((item) => fieldOperationMatchesFilter(item, "attention")).map((item) => item.fieldName), ["Field 2", "Field 3"]);
  assert.deepEqual(items.filter((item) => fieldOperationMatchesFilter(item, "closed")).map((item) => item.fieldName), ["Field 3"]);
  assert.deepEqual(summarizeFieldOperations(items), { total: 3, open: 0, inUse: 1, delayed: 1, closed: 1, needsAttention: 2 });
});

test("field search is forgiving across number, map label, team, and issue", () => {
  const target = field("Field 9");
  target.sportType = "softball";
  target.mapLabel = null;
  const [item] = buildFieldOperationItems({
    venue,
    fields: [target],
    sessions: [game({ id: "next", fieldId: target.id, startTime: "2026-07-11T17:30:00.000Z", home: "Championship Sparks", away: "Bulldogs" })],
    workOrders: [issue(target.id)],
    now,
  });
  for (const query of ["9", "Field 9", "Baseball 9", "championship", "standing water"]) assert.equal(fieldOperationMatchesQuery(item, query), true, query);
  assert.equal(fieldOperationMatchesQuery(item, "soccer 14"), false);
});

test("Field Operations implementation keeps bulk reads, contextual confirmation, and scoped server mutation", () => {
  const page = readFileSync("src/app/admin/fields/page.tsx", "utf8");
  const board = readFileSync("src/app/admin/fields/field-operations-board.tsx", "utf8");
  const actions = readFileSync("src/app/admin/fields/actions.ts", "utf8");
  const audit = readFileSync("docs/ui-ux-1.1-field-operations.md", "utf8");
  assert.match(page, /Promise\.all/);
  assert.match(page, /getScopedVenuesAndFields/);
  assert.match(board, /md:grid-cols-2 xl:grid-cols-3/);
  assert.match(board, /does not move or cancel games/);
  assert.match(board, /Needs Attention/);
  assert.match(actions, /canOpenCloseField/);
  assert.match(actions, /assertFieldInScope/);
  assert.match(actions, /updateFieldStatus\(fieldId, status, ctx\.userId\)/);
  assert.match(audit, /Pre-implementation workflow audit/);
});
