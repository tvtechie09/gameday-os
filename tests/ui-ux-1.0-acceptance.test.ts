import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { flagshipVenueDisplayName, flagshipVenueScopeSlug } from "../src/lib/access/demo-users.ts";
import { LiveWeatherError, publicWeatherErrorMessage } from "../src/lib/services/weather-errors.ts";

const roleSeed = readFileSync("supabase/role-based-experiences-seed.sql", "utf8");
const gameSeed = readFileSync("supabase/connected-game-engine-seed.sql", "utf8");
const identityLayout = readFileSync("src/app/admin/identity/layout.tsx", "utf8");
const proxy = readFileSync("src/proxy.ts", "utf8");
const publicVenuePage = readFileSync("src/app/venues/[venueId]/page.tsx", "utf8");
const publicFieldPage = readFileSync("src/app/fields/[fieldId]/page.tsx", "utf8");

test("Venue demo identities target the canonical populated Crossroads venue", () => {
  assert.equal(flagshipVenueDisplayName, "Wintrust Crossroads Sports Complex");
  assert.equal(flagshipVenueScopeSlug, "wintrust-crossroads-sports-complex");
  assert.doesNotMatch(roleSeed, /Crossroads Test Complex/);
  assert.doesNotMatch(gameSeed, /Crossroads Test Complex/);
  assert.match(roleSeed, /select id into strict v_venue_id[\s\S]*Wintrust Crossroads Sports Complex/);
  assert.match(gameSeed, /Wintrust Crossroads Sports Complex/);
});

test("optional weather failures use neutral consumer-safe fallback copy", () => {
  const missingKey = new LiveWeatherError(
    "missing_api_key",
    "Weather provider API key is missing. Set OPENWEATHER_API_KEY in Vercel Production and Preview.",
    500,
  );
  const missingCoordinates = new LiveWeatherError("missing_coordinates", "Add latitude and longitude.", 422);

  assert.equal(publicWeatherErrorMessage(missingKey), "Live weather is temporarily unavailable.");
  assert.equal(publicWeatherErrorMessage(missingCoordinates), "Live weather is not available for this venue right now.");
  assert.doesNotMatch(publicWeatherErrorMessage(missingKey), /api|key|vercel/i);
});

test("Identity administration has a server-rendered permission boundary", () => {
  assert.match(identityLayout, /getSessionContext\(\)/);
  assert.match(identityLayout, /canManageUsers\(ctx\)/);
  assert.match(identityLayout, /redirect\(getRoleHome\(ctx\)\)/);
});

test("Next registers request protection from the src directory used by the app", () => {
  assert.equal(existsSync("proxy.ts"), false);
  assert.match(proxy, /guardForAdminPath/);
  assert.match(proxy, /auth\.getUser\(\)/);
});

test("public venue and field pages use the standardized status presentation", () => {
  for (const source of [publicVenuePage, publicFieldPage]) {
    assert.match(source, /fieldStatusPresentation/);
    assert.match(source, /alertLevelPresentation/);
  }
});
