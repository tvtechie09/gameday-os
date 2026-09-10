import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildAccessContext } from "../src/lib/access/capabilities.ts";
import { guardForAdminPath } from "../src/lib/access/navigation.ts";

const page = readFileSync("src/app/admin/command-center/end-of-day/page.tsx", "utf8");
const navigation = readFileSync("src/lib/access/navigation.ts", "utf8");
const service = readFileSync("src/lib/services/end-of-day.ts", "utf8");

test("closeout is a compact read-only question rather than a duplicate dashboard", () => {
  assert.match(page, /Anything to handle before you leave\?/);
  assert.match(page, /You&apos;re all set for today\./);
  assert.match(page, /This is a read-only checklist/);
  assert.doesNotMatch(page, /close venue|acknowledge day/i);
});

test("every closeout concern links to its canonical owning surface", () => {
  assert.match(page, /\/admin\/fields\/work-orders\/\$\{issue\.id\}/);
  assert.match(page, /\/admin\/sessions\/\$\{game\.id\}/);
  assert.match(page, /href="\/admin\/fields"/);
  assert.match(page, /\/admin\/alerts\/\$\{announcement\.id\}\/edit/);
  assert.match(page, /href="\/admin\/assets"/);
});

test("End of Day is manager-only in navigation and direct-route authorization", () => {
  assert.match(navigation, /key: "end-of-day"[^\n]+canManageVenueSettings/);
  assert.match(navigation, /prefix: "\/admin\/command-center\/end-of-day"[^\n]+canManageVenueSettings/);
  assert.match(page, /if \(!canManageVenueSettings\(ctx\)\) redirect/);
  const gm = buildAccessContext({ userId: "gm", email: "gm@example.test", displayName: "GM", roleKey: "venue_director", scopeType: "venue", scopeId: "v1", venueId: "v1" });
  const staff = buildAccessContext({ userId: "staff", email: "staff@example.test", displayName: "Staff", roleKey: "venue_staff", scopeType: "venue", scopeId: "v1", venueId: "v1" });
  const guard = guardForAdminPath("/admin/command-center/end-of-day");
  assert.equal(guard(gm), true);
  assert.equal(guard(staff), false);
});

test("loader filters all source records to the acting venue", () => {
  assert.match(service, /venueId === venue\.id/);
  assert.match(service, /fieldIds\.has\(order\.fieldId\)/);
  assert.match(service, /alerts\.filter\(\(alert\) => alert\.venueId === venue\.id\)/);
});

test("historical viewing is a small recent-date control", () => {
  assert.match(page, /type="date"/);
  assert.match(page, /most recent 14 venue-local days/);
});
