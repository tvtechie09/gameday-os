import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatSearchDateTime, normalizeSearchText, searchCandidates, type UniversalSearchCandidate } from "../src/lib/universal-search-core.ts";

const candidates: UniversalSearchCandidate[] = [
  { type: "field", title: "Field 7", subtitle: "North pod · delayed", href: "/admin/fields?fieldId=crossroads-7", status: "delayed", relevance: 0, identifier: "7", current: true },
  { type: "field", title: "Field 70", subtitle: "Riverside · open", href: "/admin/fields?fieldId=riverside-70", status: "open", relevance: 0, identifier: "70" },
  { type: "game", title: "Águilas Semifinal", subtitle: "3:00 PM · Field 4", href: "/admin/sessions/game-1", status: "scheduled", relevance: 0, secondary: ["Celtics", "Tigers"] },
  { type: "work_order", title: "Scoreboard not powering on", subtitle: "Field 7 · in progress", href: "/admin/fields/work-orders/wo-104", status: "in_progress", relevance: 0, identifier: "Work Order 104", current: true },
];

test("Universal Search normalizes case, punctuation, spaces, and accents", () => {
  assert.equal(normalizeSearchText("  ÁGUILAS—Field #7  "), "aguilas field 7");
  assert.equal(searchCandidates(candidates, "aguilas semifinal")[0]?.title, "Águilas Semifinal");
  assert.equal(searchCandidates(candidates, "scoreboard")[0]?.type, "work_order");
});

test("short field identifiers and Work Order identifiers rank deterministically", () => {
  assert.equal(searchCandidates(candidates, "7")[0]?.title, "Field 7");
  assert.equal(searchCandidates(candidates, "Field 7")[0]?.title, "Field 7");
  assert.equal(searchCandidates(candidates, "Work Order 104")[0]?.href, "/admin/fields/work-orders/wo-104");
  assert.deepEqual(searchCandidates(candidates, "nothing-here"), []);
});

test("search formats schedule times using each field's venue timezone", () => {
  const instant = "2026-09-12T17:15:00.000Z";
  assert.equal(formatSearchDateTime(instant, "America/Chicago"), "Sep 12, 12:15 PM");
  assert.equal(formatSearchDateTime(instant, "America/Los_Angeles"), "Sep 12, 10:15 AM");
  assert.equal(formatSearchDateTime("not-a-date", "America/Chicago"), "Scheduled game");
});

test("Venue search source scopes queries before ranking and keeps Staff out of Schedule", () => {
  const source = readFileSync(new URL("../src/lib/services/universal-search.ts", import.meta.url), "utf8");
  assert.match(source, /fieldQuery = fieldQuery\.in\("venue_id", venueIds\)/);
  assert.match(source, /workOrderQuery = workOrderQuery\.in\("venue_id", venueIds\)/);
  assert.match(source, /\.in\("field_id", fieldIds\)/);
  assert.match(source, /if \(canManageSchedule\(ctx\) && fieldIds\.length\)/);
  assert.doesNotMatch(source, /identity|canonical_person|email|phone/i);
});

test("search telemetry accepts only coarse search events and never a raw query field", () => {
  const source = readFileSync(new URL("../src/lib/pilot-telemetry-core.ts", import.meta.url), "utf8");
  for (const event of ["search_opened", "search_submitted", "search_result_opened", "search_no_results"]) assert.match(source, new RegExp(`"${event}"`));
  assert.doesNotMatch(source, /rawQuery|queryText/);
});

test("Venue search sheet carries mobile and keyboard accessibility contracts", () => {
  const source = readFileSync(new URL("../src/components/universal-search.tsx", import.meta.url), "utf8");
  assert.match(source, /htmlFor="venue-universal-search"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /ArrowDown/);
  assert.match(source, /ArrowUp/);
  assert.match(source, /min-h-16/);
  assert.match(source, /onPopState/);
});
