import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { PRODUCT_CAPABILITY_OWNERSHIP, PROHIBITED_NATIVE_SPORTS_CAPABILITIES } from "../src/lib/product-boundary.ts";
import { getIntegrationProvider } from "../src/lib/integration-framework.ts";

describe("GameDay provider ownership boundary", () => {
  it("keeps provider workflows external and venue context GameDay-owned", () => {
    for (const capability of ["REGISTRATION", "PAYMENT", "SCOREBOOK", "DETAILED_STATS", "VIDEO_STREAM"] as const) {
      assert.ok(PROHIBITED_NATIVE_SPORTS_CAPABILITIES.includes(capability));
    }
    assert.equal(PRODUCT_CAPABILITY_OWNERSHIP.REGISTRATION, "LINK_OUT_ONLY");
    assert.equal(PRODUCT_CAPABILITY_OWNERSHIP.PAYMENT, "LINK_OUT_ONLY");
    assert.equal(PRODUCT_CAPABILITY_OWNERSHIP.DETAILED_STATS, "PROVIDER_AUTHORITATIVE");
    assert.equal(PRODUCT_CAPABILITY_OWNERSHIP.VENUE_STATUS, "GAMEDAY_AUTHORITATIVE");
    assert.equal(PRODUCT_CAPABILITY_OWNERSHIP.SCHEDULE, "MERGED_RESOLVED");
  });

  it("describes integrations as complement-not-replace", () => {
    const sportsEngine = getIntegrationProvider("sportsengine");
    const gameChanger = getIntegrationProvider("gamechanger");
    const streaming = getIntegrationProvider("streaming");
    assert.ok(sportsEngine?.internalNotes.includes("remain SportsEngine link-outs"));
    assert.equal(gameChanger?.integrationMode, "LINK_OUT");
    assert.equal(gameChanger?.capabilities.live_data, false);
    assert.equal(streaming?.integrationMode, "LINK_OUT");
    assert.ok(streaming?.internalNotes.includes("No custom streaming CDN"));
  });

  it("keeps manual score entry limited to scoreboard display state", async () => {
    const scorekeeper = await readFile(new URL("../src/lib/services/scorekeeper.ts", import.meta.url), "utf8");
    assert.match(scorekeeper, /not a detailed scorebook or player[\s\S]*statistics engine/i);
    assert.doesNotMatch(scorekeeper, /batting_average|earned_run_average|pitch_count|player_stats/i);
  });

  it("keeps Integration Hub provider ownership explicit", async () => {
    const page = await readFile(new URL("../src/app/admin/integrations/page.tsx", import.meta.url), "utf8");
    assert.match(page, /each provider remains its system of record/i);
    assert.match(page, /Registration, payments, forms, scorebooks, and streams stay provider-owned/i);
  });

  it("keeps canonical Tournament records read-only to browser roles", async () => {
    const migration = await readFile(new URL("../supabase/migrations/20260901021909_harden_tournament_write_grants.sql", import.meta.url), "utf8");
    assert.match(migration, /revoke insert, update, delete, truncate, references, trigger/i);
    assert.match(migration, /from public, anon, authenticated/i);
    assert.match(migration, /grant select on table public\.tournaments to anon, authenticated/i);
    assert.match(migration, /service_role/i);
  });

  it("keeps score mutation and venue technology projection behind server authority", async () => {
    const migration = await readFile(new URL("../supabase/migrations/20260901022041_harden_boundary_functions_and_view.sql", import.meta.url), "utf8");
    assert.match(migration, /revoke all on function public\.game_engine_apply/i);
    assert.match(migration, /from public, anon, authenticated/i);
    assert.match(migration, /grant execute on function public\.game_engine_apply[\s\S]*to service_role/i);
    assert.match(migration, /venue_technology_profile set \(security_invoker = true\)/i);
    assert.match(migration, /sync_snapshot_revision\(\) set search_path = public/i);
    assert.match(migration, /game_events_block_mutation\(\) set search_path = public/i);
  });
});
