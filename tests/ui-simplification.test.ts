import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const audit = readFileSync("docs/ui-ux-simplification.md", "utf8");
const schedule = readFileSync("src/app/admin/sessions/page.tsx", "utf8");
const gameForm = readFileSync("src/app/admin/sessions/new/session-form.tsx", "utf8");
const alertForm = readFileSync("src/app/admin/alerts/new/alert-form.tsx", "utf8");
const alertList = readFileSync("src/app/admin/alerts/page.tsx", "utf8");
const dashboard = readFileSync("src/app/admin/sessions/[sessionId]/page.tsx", "utf8");
const globalStyles = readFileSync("src/app/globals.css", "utf8");

test("1.0C documents the major customer and advanced operational surfaces", () => {
  for (const route of ["/today", "/admin/sessions", "/admin/alerts", "/admin/operations-center", "/admin/fields", "/org", "/fields/[fieldId]"]) {
    assert.match(audit, new RegExp(route.replaceAll("/", "\\/").replace("[", "\\[").replace("]", "\\]")));
  }
  assert.match(audit, /Games: `ON TIME`, `STARTING SOON`, `IN PROGRESS`, `DELAYED`, `CANCELLED`, `FINAL`/);
  assert.match(audit, /Alerts: `INFORMATIONAL`, `IMPORTANT`, `URGENT`/);
});

test("schedule prioritizes search, one new-game action, and progressive card detail", () => {
  assert.match(schedule, /<SearchField/);
  assert.match(schedule, /Schedule tools/);
  assert.match(schedule, /<GameDayCard/);
  assert.match(schedule, />New game</);
  assert.match(schedule, />Open game</);
  assert.doesNotMatch(schedule, />New session</);
});

test("common create workflows keep expert controls behind advanced disclosure", () => {
  assert.match(gameForm, /Advanced game details/);
  assert.match(gameForm, /Game or event name/);
  assert.match(gameForm, /Create game/);
  assert.doesNotMatch(gameForm, /Session title/);
  assert.match(alertForm, /Advanced delivery options/);
  assert.match(alertForm, /Informational/);
  assert.match(alertForm, /Important/);
  assert.match(alertForm, /Urgent/);
  assert.match(alertForm, /Publish update/);
  assert.match(gameForm, /bottom-\[calc\(4\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(alertForm, /bottom-\[calc\(4\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
});

test("secondary operations stay available without competing with the primary action", () => {
  assert.match(alertList, /Filter updates/);
  assert.match(alertList, /Advanced cleanup/);
  assert.match(alertList, /Manage update/);
  assert.match(dashboard, /Open score control/);
  assert.match(dashboard, /More game tools/);
  assert.match(dashboard, /Activity details/);
});

test("nonessential motion respects the operating system preference", () => {
  assert.match(globalStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(globalStyles, /animation-duration: 0\.01ms/);
});
