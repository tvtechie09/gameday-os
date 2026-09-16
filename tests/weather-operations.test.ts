import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260831023709_venue_weather_operations.sql", "utf8");
const stormPage = readFileSync("src/app/admin/alerts/storm/page.tsx", "utf8");
const publicCard = readFileSync("src/components/weather/weather-operations-status-card.tsx", "utf8");
const venuePage = readFileSync("src/app/venues/[venueId]/page.tsx", "utf8");
const fieldPage = readFileSync("src/app/fields/[fieldId]/page.tsx", "utf8");

test("weather operations store one private state per venue with acknowledgement and restart time", () => {
  assert.match(migration, /venue_id uuid primary key/);
  assert.match(migration, /restart_not_before timestamptz/);
  assert.match(migration, /acknowledged_at timestamptz/);
  assert.match(migration, /affected_field_ids uuid\[\]/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public\.venue_weather_operations from anon, authenticated/);
  assert.match(migration, /grant select, insert, update, delete on public\.venue_weather_operations to service_role/);
});

test("weather workflow has evacuation, hold, restart countdown, all-clear, and server-side scope", () => {
  for (const action of ["evacuating", "hold", "restart_countdown", "all_clear"]) assert.match(stormPage, new RegExp(`value="${action}"`));
  assert.match(stormPage, /venueInScope\(ctx, venue\)/);
  assert.match(stormPage, /updateFieldStatus\(field\.id, "delayed", ctx\.userId\)/);
  assert.match(stormPage, /setVenueWeatherOperation/);
  assert.match(stormPage, /alert_visibility: "public"/);
});

test("public QR pages show only the safe weather summary, never staff acknowledgement identity", () => {
  assert.match(venuePage, /WeatherOperationsStatusCard/);
  assert.match(fieldPage, /WeatherOperationsStatusCard/);
  assert.match(publicCard, /state\.message/);
  assert.match(publicCard, /state\.restartNotBefore/);
  assert.doesNotMatch(publicCard, /acknowledgedBy|acknowledgedAt|affectedFieldIds|updatedBy/);
  assert.doesNotMatch(venuePage, /getWorkOrders|getVenueAssets|diagnosticSummary|assignedToUserId/);
  assert.doesNotMatch(fieldPage, /getWorkOrders|getVenueAssets|diagnosticSummary|assignedToUserId/);
});

test("fan experience retains schedule, current score, field map, resources, sponsors, and follow controls", () => {
  assert.match(venuePage, /Today at this venue/);
  assert.match(venuePage, /Venue Map/);
  assert.match(venuePage, /Available Resources/);
  assert.match(venuePage, /Sponsors/);
  assert.match(fieldPage, /LiveScore/);
  assert.match(fieldPage, /FollowButtons/);
  assert.match(fieldPage, /Field page shortcuts/);
});
