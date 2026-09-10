import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  defaultVenueNotificationPreferences,
  notificationCategoryForType,
  shouldShowVenueNotification,
  venueNotificationCategories,
} from "../src/lib/notification-preferences-core.ts";

const migration = readFileSync("supabase/migrations/20260910103000_notification_preferences_2_1a.sql", "utf8");
const service = readFileSync("src/lib/services/notification-preferences.ts", "utf8");
const action = readFileSync("src/app/admin/account/actions.ts", "utf8");
const form = readFileSync("src/app/admin/account/notification-preferences-form.tsx", "utf8");
const notifications = readFileSync("src/lib/services/notifications.ts", "utf8");
const alertService = readFileSync("src/lib/services/alerts.ts", "utf8");
const followerMigration = readFileSync("supabase/migrations/20260829161427_follower_notification_preferences.sql", "utf8");

test("Venue defaults reduce manager noise while keeping frontline work updates", () => {
  const manager = defaultVenueNotificationPreferences("venue_director");
  const staff = defaultVenueNotificationPreferences("venue_staff");
  assert.equal(manager.find((item) => item.category === "work_updates")?.enabled, false);
  assert.equal(staff.find((item) => item.category === "work_updates")?.enabled, true);
  assert.equal(manager.find((item) => item.category === "field_venue_changes")?.enabled, true);
  assert.equal(staff.find((item) => item.category === "announcements")?.enabled, true);
});

test("plain-language categories map the existing event types", () => {
  assert.deepEqual(venueNotificationCategories, ["game_changes", "field_venue_changes", "work_updates", "announcements"]);
  assert.equal(notificationCategoryForType("session_status"), "game_changes");
  assert.equal(notificationCategoryForType("field_status"), "field_venue_changes");
  assert.equal(notificationCategoryForType("resource"), "work_updates");
  assert.equal(notificationCategoryForType("alert"), "announcements");
});

test("category opt-out works and urgent safety visibility is narrowly mandatory", () => {
  const preferences = defaultVenueNotificationPreferences("venue_director").map((item) => ({ ...item, enabled: false }));
  assert.equal(shouldShowVenueNotification({ category: "announcements", priority: "normal", preferences }), false);
  assert.equal(shouldShowVenueNotification({ category: "announcements", priority: "urgent", preferences }), true);
});

test("preference storage is own-user and venue scoped with no browser grants", () => {
  assert.match(service, /ctx\.authUserId/);
  assert.match(service, /ctx\.venueId/);
  assert.doesNotMatch(action, /auth_user_id|venue_id/);
  assert.match(migration, /unique \(auth_user_id, venue_id, category, channel\)/);
  assert.match(migration, /revoke all on table public\.venue_notification_preferences from anon, authenticated/);
  assert.match(migration, /force row level security/);
});

test("legacy notification browser access is removed and delivery remains best effort", () => {
  assert.match(migration, /drop policy if exists "Public can read notifications"/);
  assert.match(migration, /drop policy if exists "Public can create notifications"/);
  assert.match(notifications, /safelyCreateNotification/);
  assert.match(notifications, /Failed to create notification/);
});

test("stable event keys deduplicate repeated Venue notification inserts", () => {
  assert.match(migration, /unique \(notification_type, dedupe_key\)/);
  assert.match(alertService, /dedupe_key: `alert:\$\{mappedAlert\.id\}`/);
  assert.match(notifications, /error\.code === "23505"/);
  assert.match(notifications, /eq\("dedupe_key", data\.dedupe_key\)/);
});

test("unsupported delivery channels stay hidden", () => {
  assert.match(form, /Delivery channel: in app/);
  assert.match(form, /SMS and push are not enabled/);
  assert.doesNotMatch(form, /type="checkbox"[^>]+name="email"/);
  assert.doesNotMatch(form, /type="checkbox"[^>]+name="sms"/);
});

test("public follower preferences remain token-bound and separate", () => {
  assert.match(followerMigration, /manage_token uuid not null default gen_random_uuid\(\)/);
  assert.match(followerMigration, /critical_only/);
  assert.match(followerMigration, /all_updates/);
});
