import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildClientReadinessChecks, buildReferenceDemoGames, REFERENCE_DEMO_GAME_COUNT, summarizeClientReadiness } from "../src/lib/services/client-readiness-core.ts";

test("reference demo schedule is deterministic, balanced across fields, and source-addressable", () => {
  const games = buildReferenceDemoGames({ fieldIds: ["field-a", "field-b", "field-c"], organizationId: "demo-org", now: Date.UTC(2026, 7, 29, 18) });
  assert.equal(games.length, REFERENCE_DEMO_GAME_COUNT);
  assert.deepEqual(games.slice(0, 6).map((game) => game.fieldId), ["field-a", "field-b", "field-c", "field-a", "field-b", "field-c"]);
  assert.equal(new Set(games.map((game) => game.externalId)).size, games.length);
  assert.ok(games.every((game) => new Date(game.endTime) > new Date(game.startTime)));
});

test("client readiness blocks only required operating prerequisites", () => {
  const checks = buildClientReadinessChecks({ campaignCount: 0, demoSessionCount: 12, fieldCount: 4, publicUrlReady: true, sponsorCount: 0, venueProfileReady: true, weatherReady: true });
  assert.equal(summarizeClientReadiness(checks).canDemo, true, "sponsor proof is valuable but optional for the core buyer story");
  const missingPublicUrl = checks.map((check) => check.key === "public_url" ? { ...check, passed: false } : check);
  assert.deepEqual(summarizeClientReadiness(missingPublicUrl).blockers, ["Shareable public URL"]);
});

test("demo preparation is guarded by persisted demo flags", () => {
  const service = readFileSync("src/lib/services/client-readiness.ts", "utf8");
  const refreshService = readFileSync("src/lib/services/demo-day.ts", "utf8");
  assert.match(service, /organization\?\.is_demo/);
  assert.match(service, /venue\?\.is_demo/);
  assert.match(service, /venue\.organization_id !== organizationId/);
  assert.match(service, /eq\("is_demo", true\)/);
  assert.match(service, /refreshDemoDay\(ctx, \{ sessionIds:/);
  assert.match(refreshService, /demoSessionsQuery\.in\("id", options\.sessionIds\)/);
});

test("client-facing materials pin integration truth and the pilot ask", () => {
  const matrix = readFileSync("docs/client-readiness/integration-maturity.md", "utf8");
  const demo = readFileSync("docs/client-readiness/buyer-demo.md", "utf8");
  assert.match(matrix, /SportsEngine[^\n]*Implemented but unverified/);
  assert.match(matrix, /GameChanger[^\n]*Framework or demo only/);
  assert.match(matrix, /Daktronics[^\n]*Implemented but unverified/);
  assert.match(demo, /one operating date/i);
  assert.doesNotMatch(demo, /every system.*built-in/i);
});
