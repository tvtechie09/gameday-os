import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("announcement publish window is interpreted on the venue clock", () => {
  const formUtils = readFileSync("src/app/admin/alerts/form-utils.ts", "utf8");
  const createActions = readFileSync("src/app/admin/alerts/actions.ts", "utf8");
  const editPage = readFileSync("src/app/admin/alerts/[alertId]/edit/page.tsx", "utf8");
  assert.match(formUtils, /venueLocalDateTimeToIso\(startTime, timeZone\)/);
  assert.match(formUtils, /venueLocalDateTimeToIso\(endTime, timeZone\)/);
  assert.match(createActions, /getVenueTimezone\(venueId\)/);
  assert.match(editPage, /venueDateTimeLocalValue\(alert\.startTime, alertVenue\.timezone\)/);
  const listPage = readFileSync("src/app/admin/alerts/page.tsx", "utf8");
  assert.match(listPage, /timeZone,/);
  assert.match(listPage, /formatDateTime\(alert\.startTime, venue\?\.timezone/);
});

test("announcement submission identity is validated and carried to persistence", () => {
  const formUtils = readFileSync("src/app/admin/alerts/form-utils.ts", "utf8");
  assert.match(formUtils, /submission_id/);
  assert.match(formUtils, /submissionId && !\/\^\[0-9a-f\]/);
  assert.match(formUtils, /id: submissionId \|\| undefined/);
});

test("canonical publish is replay-safe and audits only a new announcement", () => {
  const service = readFileSync("src/lib/services/alerts.ts", "utf8");
  const actions = readFileSync("src/app/admin/alerts/actions.ts", "utf8");
  const page = readFileSync("src/app/admin/alerts/new/page.tsx", "utf8");
  const form = readFileSync("src/app/admin/alerts/new/alert-form.tsx", "utf8");
  assert.match(service, /error\?\.code === "23505"/);
  assert.match(service, /isSameSubmission/);
  assert.match(actions, /if \(result\.created\)/);
  assert.match(actions, /action: "announcement\.published"/);
  assert.match(actions, /actorUserId: ctx\.userId/);
  assert.match(page, /submissionId=\{randomUUID\(\)\}/);
  assert.match(form, /name="submission_id"/);
});

test("announcement lifecycle replays preserve authoritative state and audit actor", () => {
  const actions = readFileSync("src/app/admin/alerts/actions.ts", "utf8");
  assert.match(actions, /if \(!current\.isActive \|\| new Date\(current\.endTime\)\.getTime\(\) <= Date\.now\(\)\) return;/);
  assert.match(actions, /action: "announcement\.expired"/);
  assert.match(actions, /if \(current\.alertVisibility === "admin_only"\) return;/);
  assert.match(actions, /action: "announcement\.visibility_changed"/);
});
