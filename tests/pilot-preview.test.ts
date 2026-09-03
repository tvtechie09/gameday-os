import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildAccessContext } from "../src/lib/access/capabilities.ts";
import { buildNavigation, guardForAdminPath } from "../src/lib/access/navigation.ts";
import {
  durationBucket,
  isPilotEventName,
  outcomeForFailureCode,
  pageEventForPath,
  sanitizePilotContext,
  viewportCategory,
  workflowSource,
} from "../src/lib/pilot-telemetry-core.ts";

test("pilot telemetry accepts only controlled events and metadata", () => {
  assert.equal(isPilotEventName("pilot_today_opened"), true);
  assert.equal(isPilotEventName("arbitrary_click"), false);
  assert.deepEqual(sanitizePilotContext({
    actionType: "resolve",
    durationBucket: "10_30_sec",
    email: "private@example.com",
    error: "raw database failure",
    note: "private note",
    outcome: "completed",
    source: "work_orders",
    token: "secret",
    viewport: "phone",
  }), {
    actionType: "resolve",
    durationBucket: "10_30_sec",
    outcome: "completed",
    source: "work_orders",
    viewport: "phone",
  });
});

test("pilot context uses coarse timing, viewport, source, and failure categories", () => {
  assert.equal(durationBucket(9_999), "under_10_sec");
  assert.equal(durationBucket(10_000), "10_30_sec");
  assert.equal(durationBucket(60_000), "over_60_sec");
  assert.equal(viewportCategory(390), "phone");
  assert.equal(viewportCategory(768), "tablet");
  assert.equal(viewportCategory(1440), "desktop");
  assert.equal(workflowSource("/admin/fields"), "fields");
  assert.equal(workflowSource("/admin/fields/work-orders"), "work_orders");
  assert.equal(outcomeForFailureCode("permission"), "denied");
  assert.equal(outcomeForFailureCode("conflict"), "conflict");
  assert.equal(outcomeForFailureCode("temporary"), "failed");
});

test("canonical pilot screens map to high-value open events", () => {
  assert.equal(pageEventForPath("/admin"), "pilot_home_opened");
  assert.equal(pageEventForPath("/today"), "pilot_today_opened");
  assert.equal(pageEventForPath("/admin/fields"), "pilot_fields_opened");
  assert.equal(pageEventForPath("/admin/fields/work-orders/7124beed-fde4-4576-ac5c-57be9991da01"), "pilot_work_order_opened");
  assert.equal(pageEventForPath("/admin/fields/field-4/disruption"), "pilot_disruption_review_opened");
  assert.equal(pageEventForPath("/admin/developer"), null);
});

test("Venue Staff can reach pilot feedback without gaining manager routes", () => {
  const staff = buildAccessContext({
    displayName: "Pilot Staff",
    email: "staff@example.test",
    permissions: ["venue.field.manage", "venue.alert.send", "game.status.update"],
    roleKey: "venue_staff",
    scopeId: "11111111-1111-4111-8111-111111111101",
    scopeType: "venue",
    userId: "11111111-1111-4111-8111-111111111111",
    venueId: "11111111-1111-4111-8111-111111111101",
  });
  const hrefs = buildNavigation(staff).flatMap((group) => group.items.map((item) => item.href));
  assert.ok(hrefs.includes("/admin/feedback"));
  assert.equal(guardForAdminPath("/admin/feedback")(staff), true);
  assert.equal(guardForAdminPath("/admin/sessions")(staff), false);
  assert.equal(guardForAdminPath("/admin/venues")(staff), false);
});

test("pilot feedback distinguishes product feedback and stores no automatic identity", () => {
  const page = readFileSync("src/app/admin/feedback/page.tsx", "utf8");
  const form = readFileSync("src/app/admin/feedback/feedback-form.tsx", "utf8");
  const action = readFileSync("src/app/admin/feedback/actions.ts", "utf8");
  assert.match(page, /product feedback—not an urgent field/);
  assert.match(page, /Use Work Orders/);
  assert.match(form, /Confusing/);
  assert.match(form, /Bug/);
  assert.match(form, /Suggestion/);
  assert.match(action, /person_name: ""/);
  assert.match(action, /person_email: ""/);
  assert.match(action, /actor_id: ""/);
  assert.doesNotMatch(action, /ctx\?\.(displayName|email|userId)/);
});

test("pilot telemetry is best-effort and weather fallback is not error-level", () => {
  const client = readFileSync("src/components/pilot/pilot-telemetry.tsx", "utf8");
  const route = readFileSync("src/app/api/pilot/events/route.ts", "utf8");
  const weather = readFileSync("src/lib/services/weather-live.ts", "utf8");
  assert.match(client, /\.catch\(\(\) => undefined\)/);
  assert.match(route, /status: 202/);
  assert.match(route, /never returns internal errors/);
  assert.doesNotMatch(weather, /console\.error\("Weather API missing venue coordinates"/);
  assert.match(weather, /optional venue coordinates are not configured/);
});

test("pilot build info exposes only a safe runtime Supabase project reference", () => {
  const build = readFileSync("src/lib/pilot-build.ts", "utf8");
  const shell = readFileSync("src/components/access/app-shell.tsx", "utf8");
  assert.match(build, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(build, /\^\[a-z0-9\]\{20\}\\\.supabase\\\.co\$/);
  assert.doesNotMatch(build, /SUPABASE_SERVICE_ROLE_KEY|ANON_KEY/);
  assert.match(shell, /pilotInfo\.stagingProjectRef/);
});
