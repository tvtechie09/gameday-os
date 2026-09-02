import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/today/page.tsx", "utf8");
const timeline = readFileSync("src/app/today/today-timeline.tsx", "utf8");
const actions = readFileSync("src/app/today/actions.ts", "utf8");
const service = readFileSync("src/lib/services/venue-operations.ts", "utf8");
const fieldBoard = readFileSync("src/app/admin/fields/field-operations-board.tsx", "utf8");
const fieldActions = readFileSync("src/app/admin/fields/actions.ts", "utf8");

test("Fields owns field status controls with server authorization", () => {
  assert.doesNotMatch(page, /TodayFieldStatusControl|setFieldStatusAction/);
  assert.match(page, /href="\/admin\/fields">Check fields/);
  assert.match(fieldBoard, /setFieldOperationalStatusAction/);
  assert.match(fieldActions, /canOpenCloseField\(ctx\)/);
  assert.match(fieldActions, /assertFieldInScope\(fieldId\)/);
});

test("Today uses the universal card with progressive details and safe drill-down links", () => {
  assert.match(timeline, /<GameDayCard/);
  assert.match(timeline, /event\.homeScore/);
  assert.match(timeline, /event\.awayScore/);
  assert.match(timeline, /\/scoreboard\/\$\{event\.id\}/);
  assert.match(timeline, /\/fields\/\$\{event\.fieldId\}/);
  assert.match(service, /homeScore: session\.homeScore/);
  assert.match(service, /lifecycleStatus: session\.lifecycleStatus/);
});

test("Today remains chronological without a duplicate field administration section", () => {
  assert.match(page, /id="today-timeline"/);
  assert.doesNotMatch(page, /title="Field status"/);
  assert.match(timeline, /title: "Now"/);
  assert.match(timeline, /title: "Next"/);
  assert.match(timeline, /title: "Later today"/);
  assert.match(timeline, /title: "Changed or needs attention"/);
  assert.match(timeline, /title: "Completed"/);
});

test("Today filters stay simple and assignments are not invented", () => {
  assert.match(timeline, /label: "All"/);
  assert.match(timeline, /label: "Needs Attention"/);
  assert.match(timeline, /hasAssignments \? \[\{ key: "mine"/);
  assert.match(timeline, /<Sheet/);
  assert.match(page, /canViewCommandCenter\(ctx\)/);
  assert.match(actions, /canStartGame\(ctx\)/);
  assert.match(actions, /canDelayGame\(ctx\)/);
});
