import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/today/page.tsx", "utf8");
const control = readFileSync("src/app/today/today-field-status-control.tsx", "utf8");
const actions = readFileSync("src/app/today/actions.ts", "utf8");
const service = readFileSync("src/lib/services/venue-operations.ts", "utf8");

test("Today field status controls remain permission gated and server authorized", () => {
  assert.match(page, /canOpenCloseField\(ctx\) \? \(/);
  assert.match(control, /setFieldStatusAction\(fieldId, selectedStatus\)/);
  assert.match(actions, /canOpenCloseField\(ctx\)/);
  assert.match(actions, /fieldStatuses\.includes\(status\)/);
  for (const status of ["open", "active", "delayed", "closed", "maintenance"]) {
    assert.match(control, new RegExp(`value: "${status}"`));
  }
});

test("Live Now expands into safe game details and public drill-down links", () => {
  assert.match(page, /<details key=\{g\.id\}/);
  assert.match(page, /g\.homeScore/);
  assert.match(page, /g\.awayScore/);
  assert.match(page, /\/scoreboard\/\$\{g\.id\}/);
  assert.match(page, /\/fields\/\$\{g\.fieldId\}/);
  assert.match(service, /homeScore: session\.homeScore/);
  assert.match(service, /lifecycleStatus: session\.lifecycleStatus/);
});
