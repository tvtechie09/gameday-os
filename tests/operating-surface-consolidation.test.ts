import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync("src/app/admin/page.tsx", "utf8");
const today = readFileSync("src/app/today/page.tsx", "utf8");
const commandCenter = readFileSync("src/app/admin/command-center/page.tsx", "utf8");
const venueStatus = readFileSync("src/app/admin/operations-center/page.tsx", "utf8");
const venueStatusActions = readFileSync("src/app/admin/operations-center/actions.ts", "utf8");
const fields = readFileSync("src/app/admin/fields/field-operations-board.tsx", "utf8");

test("Home routes rather than duplicating an operational board", () => {
  for (const question of ["What is happening now?", "Where is it happening?", "What is planned?"]) assert.match(home, new RegExp(question.replace("?", "\\?")));
  for (const href of ["/today", "/admin/fields", "/admin/sessions"]) assert.match(home, new RegExp(href.replaceAll("/", "\\/")));
  assert.doesNotMatch(home, /Platform inventory/);
});

test("Today is chronological and routes field administration to Fields", () => {
  assert.match(today, /id="today-timeline"/);
  assert.match(today, /href="\/admin\/fields">Check fields/);
  assert.match(today, /href="\/admin\/sessions">Change schedule/);
  assert.doesNotMatch(today, /TodayFieldStatusControl/);
  assert.equal(existsSync("src/app/today/today-field-status-control.tsx"), false);
});

test("retired Command Center bookmark redirects to Today and preserves query values", () => {
  assert.match(commandCenter, /Object\.entries\(resolved \?\? \{\}\)/);
  assert.match(commandCenter, /redirect\(`\/today/);
  assert.equal(existsSync("src/app/admin/command-center/actions.ts"), false);
  assert.equal(existsSync("src/app/admin/command-center/mode-checklist.tsx"), false);
});

test("Operations Center is narrowed to venue-wide state", () => {
  assert.match(venueStatus, /title="Venue status"/);
  assert.match(venueStatus, /Change the whole venue/);
  assert.match(venueStatus, /Use Fields for one location and Announcements for a custom message/);
  assert.doesNotMatch(venueStatus, /AiRecommendationsPanel|IncidentManagementPlaceholder|AutomationTargets|DelayTracking|AnnouncementForm/);
  assert.match(venueStatusActions, /canViewCommandCenter\(ctx\)/);
  assert.match(venueStatusActions, /isOrgScoped\(ctx\)/);
  assert.match(venueStatusActions, /updateFieldStatus\(fieldId, fieldStatus, ctx\.userId\)/);
});

test("field and work-order context remains attached to deep links", () => {
  assert.match(fields, /\/admin\/fields\/work-orders\?fieldId=/);
  assert.match(fields, /\/admin\/fields\/\$\{item\.fieldId\}\/disruption/);
});

test("public current-next consumers still use the shared projection", () => {
  for (const path of ["src/app/fields/[fieldId]/page.tsx", "src/app/venues/[venueId]/page.tsx"]) {
    assert.match(readFileSync(path, "utf8"), /projectFieldSessions/);
  }
});
