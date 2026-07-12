import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  getScoreboardEventTypes,
  hashScoreboardState,
  isScoreboardReadingStale,
  normalizeDaktronicsReadingPayload,
  validateDaktronicsAdapterToken,
} from "../src/lib/daktronics-scoreboard-core.ts";

describe("Daktronics read-only scoreboard integration", () => {
  it("requires adapter auth", () => {
    assert.equal(validateDaktronicsAdapterToken("token", "token"), true);
    assert.equal(validateDaktronicsAdapterToken("wrong", "token"), false);
    assert.equal(validateDaktronicsAdapterToken("token", ""), false);
  });

  it("normalizes adapter readings into GameDay scoreboard state", () => {
    const state = normalizeDaktronicsReadingPayload({ awayScore: 4, balls: 2, homeScore: 6, inning: 5, outs: 1, status: "live", strikes: 1, topBottom: "top" });
    assert.deepEqual(state, {
      awayScore: 4,
      balls: 2,
      gameClock: null,
      homeScore: 6,
      inning: 5,
      outs: 1,
      periodLabel: null,
      possession: null,
      shotClock: null,
      status: "live",
      strikes: 1,
      topBottom: "top",
    });
  });

  it("does not spam events for duplicate readings", () => {
    const state = normalizeDaktronicsReadingPayload({ awayScore: 1, homeScore: 2, status: "live" });
    assert.equal(hashScoreboardState(state), hashScoreboardState({ ...state }));
  });

  it("creates score and period events for meaningful changes", () => {
    const previous = normalizeDaktronicsReadingPayload({ awayScore: 1, homeScore: 2, inning: 2, status: "live" });
    const current = normalizeDaktronicsReadingPayload({ awayScore: 3, homeScore: 2, inning: 3, status: "live" });
    assert.deepEqual(getScoreboardEventTypes(previous, current), ["scoreboard.score_changed", "scoreboard.period_changed"]);
    assert.deepEqual(getScoreboardEventTypes(current, { ...current, status: "final" }), ["scoreboard.game_final_detected"]);
  });

  it("detects stale connections", () => {
    assert.equal(isScoreboardReadingStale("2026-07-08T10:00:00.000Z", new Date("2026-07-08T10:00:20.000Z")), false);
    assert.equal(isScoreboardReadingStale("2026-07-08T10:00:00.000Z", new Date("2026-07-08T10:01:00.000Z")), true);
  });

  it("ships schema, API route, and admin page foundations", () => {
    const migration = readFileSync("supabase/migrations/202607080007_daktronics_readonly_scoreboard_integration.sql", "utf8");
    for (const tableName of ["scoreboard_devices", "scoreboard_connections", "scoreboard_readings", "scoreboard_events", "scoreboard_adapter_logs"]) {
      assert.match(migration, new RegExp(tableName));
    }
    assert.match(migration, /is_read_only boolean not null default true/);
    assert.match(readFileSync("src/app/api/integrations/daktronics/readings/route.ts", "utf8"), /validateDaktronicsAdapterToken/);
    assert.match(readFileSync("src/app/admin/integrations/daktronics/page.tsx", "utf8"), /Read-only safe/);
  });
});
