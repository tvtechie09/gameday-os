import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { venueDateTimeLocalValue, venueLocalDateTimeToIso } from "../src/lib/venue-timezone.ts";

test("venue wall-clock input converts to the correct instant across seasonal offsets", () => {
  assert.equal(venueLocalDateTimeToIso("2026-09-12T12:00", "America/Chicago"), "2026-09-12T17:00:00.000Z");
  assert.equal(venueLocalDateTimeToIso("2026-01-12T12:00", "America/Chicago"), "2026-01-12T18:00:00.000Z");
  assert.equal(venueLocalDateTimeToIso("2026-09-12T12:00", "America/Los_Angeles"), "2026-09-12T19:00:00.000Z");
});

test("stored instants round-trip to the venue-local datetime control value", () => {
  assert.equal(venueDateTimeLocalValue("2026-09-12T17:00:00.000Z", "America/Chicago"), "2026-09-12T12:00");
  assert.equal(venueDateTimeLocalValue("2026-01-12T18:00:00.000Z", "America/Chicago"), "2026-01-12T12:00");
});

test("session create, edit, Schedule, and public field surfaces use venue time", () => {
  const createAction = readFileSync("src/app/admin/sessions/new/actions.ts", "utf8");
  const editPage = readFileSync("src/app/admin/sessions/[sessionId]/edit/page.tsx", "utf8");
  const schedulePage = readFileSync("src/app/admin/sessions/page.tsx", "utf8");
  const publicFieldPage = readFileSync("src/app/fields/[fieldId]/page.tsx", "utf8");
  assert.match(createAction, /venueLocalDateTimeToIso/);
  assert.match(editPage, /venueDateTimeLocalValue/);
  assert.match(editPage, /venueLocalDateTimeToIso/);
  assert.match(schedulePage, /venueGroup\.venue\.timezone/);
  assert.match(publicFieldPage, /timeZone=\{timeZone\}/);
});
