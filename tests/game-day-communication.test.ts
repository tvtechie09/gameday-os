import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260829161427_follower_notification_preferences.sql", "utf8");
const publicFieldPage = readFileSync("src/app/fields/[fieldId]/page.tsx", "utf8");
const commandCenter = readFileSync("src/app/admin/command-center/page.tsx", "utf8");
const notifications = readFileSync("src/app/admin/notifications/page.tsx", "utf8");
const manageRoute = readFileSync("src/app/api/follows/[token]/route.ts", "utf8");

test("follower preferences are constrained and browser updates remain denied", () => {
  assert.match(migration, /critical_only/);
  assert.match(migration, /all_updates/);
  assert.match(migration, /manage_token uuid not null default gen_random_uuid\(\)/);
  assert.match(migration, /revoke update on table public\.follows from anon, authenticated/);
});

test("preference management is tokenized and rate limited", () => {
  assert.match(manageRoute, /readToken/);
  assert.match(manageRoute, /rateLimit/);
  assert.match(manageRoute, /updateFollowPreferences/);
});

test("public QR journey exposes the fast answers and shortcuts", () => {
  assert.match(publicFieldPage, /At a glance/);
  assert.match(publicFieldPage, /Active alerts/);
  assert.match(publicFieldPage, /href="#updates"/);
  assert.match(publicFieldPage, /id="schedule"/);
  assert.match(publicFieldPage, /id="directions"/);
});

test("staff communication is mobile-first and delivery is visible", () => {
  assert.match(commandCenter, /Quick communication/);
  assert.match(commandCenter, /min-h-14/);
  assert.match(commandCenter, /weather_delay/);
  assert.match(commandCenter, /schedule_delay/);
  assert.match(commandCenter, /all_clear/);
  assert.match(notifications, /Delivery evidence/);
  assert.match(notifications, /Provider not set/);
});
