import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/today/page.tsx", "utf8");
const timeline = readFileSync("src/app/today/today-timeline.tsx", "utf8");
const control = readFileSync("src/app/today/today-field-status-control.tsx", "utf8");
const actions = readFileSync("src/app/today/actions.ts", "utf8");
const service = readFileSync("src/lib/services/venue-operations.ts", "utf8");

test("Today field status controls remain permission gated and server authorized", () => {
  assert.match(page, /canOpenCloseField\(ctx\) \? <TodayFieldStatusControl/);
  assert.match(control, /setFieldStatusAction\(fieldId, selectedStatus\)/);
  assert.match(actions, /canOpenCloseField\(ctx\)/);
  assert.match(actions, /fieldStatuses\.includes\(status\)/);
  for (const status of ["open", "active", "delayed", "closed", "maintenance"]) {
    assert.match(control, new RegExp(`value: "${status}"`));
  }
  assert.match(control, /selectedStatus === "closed" \|\| selectedStatus === "maintenance"/);
  assert.match(control, /This updates public field status and may affect scheduled games/);
  assert.match(control, /Confirm \{selectedStatus === "maintenance" \? "maintenance" : "closure"\}/);
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

test("Field Status follows the chronological Today timeline", () => {
  assert.ok(page.indexOf('id="today-timeline"') < page.indexOf('title="Field status"'));
  assert.match(timeline, /title: "Now"/);
  assert.match(timeline, /title: "Next"/);
  assert.match(timeline, /title: "Later today"/);
  assert.match(timeline, /title: "Changed or needs attention"/);
});

test("Today filters stay simple and assignments are not invented", () => {
  assert.match(timeline, /label: "All"/);
  assert.match(timeline, /label: "Needs Attention"/);
  assert.match(timeline, /hasAssignments \? \[\{ key: "mine"/);
  assert.match(timeline, /<Sheet/);
  assert.match(page, /canViewCommandCenter\(ctx\)/);
});
