import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildFieldDisruptionReview } from "../src/lib/services/field-disruption-core.ts";
import type { WorkOrder } from "../src/lib/services/work-orders.ts";
import type { Field, Session, Venue } from "../src/lib/types.ts";

const now = Date.parse("2026-07-11T16:00:00.000Z");
const venue = { id: "v1", name: "Wintrust Crossroads Sports Complex", timezone: "America/Chicago" } as Venue;
const field = (status: Field["status"]): Field => ({ id: "f1", venueId: venue.id, name: "Field 9", sportType: "baseball", status, updatedAt: new Date(now).toISOString() } as Field);
const game = (id: string, startTime: string, overrides: Partial<Session> = {}): Session => ({
  id,
  fieldId: "f1",
  title: id,
  homeTeam: "Celtics",
  awayTeam: "Tigers",
  startTime,
  endTime: null,
  status: "scheduled",
  lifecycleStatus: "scheduled",
  sportType: "baseball",
  ...overrides,
} as Session);
const issue = { id: "i1", venueId: venue.id, fieldId: "f1", title: "Standing water", priority: "high", status: "open", closedAt: null } as WorkOrder;

test("closed and maintenance fields surface every remaining valid game today", () => {
  const sessions = [
    game("current", "2026-07-11T15:30:00.000Z"),
    game("soon", "2026-07-11T16:45:00.000Z"),
    game("later", "2026-07-11T20:00:00.000Z"),
    game("cancelled", "2026-07-11T21:00:00.000Z", { lifecycleStatus: "cancelled" }),
  ];
  for (const status of ["closed", "maintenance"] as const) {
    const review = buildFieldDisruptionReview({ field: field(status), venue, sessions, workOrders: [], now });
    assert.deepEqual(review.inProgress.map((session) => session.id), ["current"]);
    assert.deepEqual(review.startingSoon.map((session) => session.id), ["soon"]);
    assert.deepEqual(review.laterToday.map((session) => session.id), ["later"]);
    assert.equal(review.affectedCount, 3);
  }
});

test("a delay conservatively flags current and next rather than the entire tail", () => {
  const review = buildFieldDisruptionReview({
    field: field("delayed"),
    venue,
    sessions: [game("current", "2026-07-11T15:30:00.000Z"), game("next", "2026-07-11T17:00:00.000Z"), game("later", "2026-07-11T21:00:00.000Z")],
    workOrders: [],
    now,
  });
  assert.deepEqual([...review.inProgress, ...review.startingSoon, ...review.laterToday].map((session) => session.id), ["current", "next"]);
  assert.match(review.explanation, /not the entire day/);
});

test("an unresolved issue preserves field context and no impact has a useful empty state", () => {
  const withIssue = buildFieldDisruptionReview({ field: field("open"), venue, sessions: [game("next", "2026-07-11T17:00:00.000Z")], workOrders: [issue], now });
  assert.equal(withIssue.reason, "issue");
  assert.equal(withIssue.affectedCount, 1);
  const noImpact = buildFieldDisruptionReview({ field: field("closed"), venue, sessions: [], workOrders: [], now });
  assert.equal(noImpact.affectedCount, 0);

  const board = readFileSync("src/app/admin/fields/field-operations-board.tsx", "utf8");
  const issuesPage = readFileSync("src/app/admin/fields/work-orders/page.tsx", "utf8");
  assert.match(board, /work-orders\?fieldId=/);
  assert.match(issuesPage, /selectedFieldId/);
  assert.match(readFileSync("src/app/admin/fields/[fieldId]/disruption/page.tsx", "utf8"), /No remaining games are affected/);
});

test("disruption movement reuses the canonical mutation with server-side authorization", () => {
  const action = readFileSync("src/app/admin/fields/[fieldId]/disruption/actions.ts", "utf8");
  const service = readFileSync("src/lib/services/schedule-operations.ts", "utf8");
  const form = readFileSync("src/app/admin/fields/[fieldId]/disruption/[sessionId]/move/move-game-form.tsx", "utf8");
  const page = readFileSync("src/app/admin/fields/[fieldId]/disruption/[sessionId]/move/page.tsx", "utf8");
  assert.match(action, /canOpenCloseField\(ctx\)/);
  assert.match(action, /assertFieldInScope\(input\.targetFieldId\)/);
  assert.match(action, /executeRapidScheduleOperation/);
  assert.match(service, /requirePermission\(actorUserId, "venue\.field\.manage"/);
  assert.match(form, /Start time/);
  assert.match(form, /Public schedule updated/);
  assert.match(page, /session\.fieldId !== field\.id/);
  assert.match(page, /currentField\.venueId !== venue\.id/);
  assert.match(page, /Public schedule updated/);
  assert.match(page, /Return to disruption review/);
  assert.doesNotMatch(action, /\.from\("sessions"\)/);
});
