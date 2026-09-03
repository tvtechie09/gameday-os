import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20260831173957_family_places_public_projection_1_5a.sql", import.meta.url), "utf8");
const fieldProtection = await readFile(new URL("../supabase/migrations/20260831182046_protect_field_internal_columns_1_5a.sql", import.meta.url), "utf8");
const service = await readFile(new URL("../src/lib/services/family-places.ts", import.meta.url), "utf8");
const adminPage = await readFile(new URL("../src/app/admin/venues/[venueId]/places/page.tsx", import.meta.url), "utf8");

test("Family place views are security-invoker and service-role only", () => {
  assert.equal((migration.match(/with \(security_invoker = true\)/g) ?? []).length, 2);
  assert.match(migration, /revoke all on public\.venue_public_summaries from public, anon, authenticated/i);
  assert.match(migration, /revoke all on public\.venue_public_places from public, anon, authenticated/i);
  assert.match(migration, /grant select on public\.venue_public_places to service_role/i);
});

test("parent projection omits operational and device data", () => {
  const views = migration.slice(migration.indexOf("create or replace view public.venue_public_summaries"));
  for (const privateTerm of ["operational_notes", "location_metadata", "cameras", "audio_systems", "venue_mode_endpoints", "maintenance_records", "ip_address", "device_id"]) assert.doesNotMatch(views, new RegExp(privateTerm, "i"));
});

test("canonical place types remain in Venue-owned tables", () => {
  assert.match(migration, /from public\.fields f/);
  assert.match(migration, /from public\.venue_zones z/);
  assert.match(migration, /from public\.play_surfaces s/);
  assert.match(migration, /from public\.amenities a/);
  assert.doesNotMatch(migration, /create table (?:if not exists )?public\.family_/i);
});

test("Venue place administration rechecks capability and venue scope", () => {
  assert.match(service, /requirePermission\(actor, "venue\.manage", "venue", input\.venueId\)/);
  assert.match(service, /\.eq\("id", input\.sourceId\)\.eq\("venue_id", input\.venueId\)/);
  assert.match(adminPage, /venueInScope\(actingCtx, target\)/);
  assert.match(adminPage, /getSessionContext\(\)/);
});

test("browser field reads retain safe columns and lose internal metadata", () => {
  assert.match(fieldProtection, /revoke select on table public\.fields from public, anon, authenticated/i);
  assert.match(fieldProtection, /grant select \([\s\S]+\) on public\.fields to anon, authenticated/i);
  const grant = fieldProtection.slice(fieldProtection.indexOf("grant select"), fieldProtection.indexOf(") on public.fields"));
  for (const privateColumn of ["resources", "status_updated_by", "operational_notes", "location_metadata"]) assert.doesNotMatch(grant, new RegExp(`\\b${privateColumn}\\b`, "i"));
});
