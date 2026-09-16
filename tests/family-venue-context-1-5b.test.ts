import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20260831212728_family_venue_context_1_5b.sql", import.meta.url), "utf8");
const service = await readFile(new URL("../src/lib/services/alerts.ts", import.meta.url), "utf8");
const actions = await readFile(new URL("../src/app/admin/alerts/actions.ts", import.meta.url), "utf8");
const editPage = await readFile(new URL("../src/app/admin/alerts/[alertId]/edit/page.tsx", import.meta.url), "utf8");
const newForm = await readFile(new URL("../src/app/admin/alerts/new/alert-form.tsx", import.meta.url), "utf8");
const placesAdmin = await readFile(new URL("../src/app/admin/venues/[venueId]/places/page.tsx", import.meta.url), "utf8");
const placesService = await readFile(new URL("../src/lib/services/family-places.ts", import.meta.url), "utf8");

test("Family announcements reuse canonical Venue alerts through a narrow service-only view", () => {
  assert.match(migration, /create or replace view public\.venue_family_announcements/);
  assert.match(migration, /with \(security_invoker = true\)/);
  assert.match(migration, /from public\.alerts a/);
  assert.doesNotMatch(migration, /create table (?:if not exists )?public\.(?:family_)?announcements/i);
  assert.match(migration, /a\.is_active[\s\S]+a\.alert_visibility = 'public'/);
  assert.match(migration, /revoke all on public\.venue_family_announcements[\s\S]+from public, anon, authenticated/i);
  assert.match(migration, /grant select on public\.venue_family_announcements to service_role/i);
});

test("projection normalizes Critical, Important, and Informational without private or arbitrary link columns", () => {
  assert.match(migration, /then 'critical'/);
  assert.match(migration, /then 'important'/);
  assert.match(migration, /else 'informational'/);
  const projection = migration.slice(migration.indexOf("create or replace view"), migration.indexOf("revoke all"));
  for (const privateTerm of ["notes", "device", "credential", "ip_address", "control", "action_url", "deep_link"]) assert.doesNotMatch(projection, new RegExp(`\\b${privateTerm}\\b`, "i"));
});

test("Venue staff publishing remains tenant and venue scoped for create, edit, hide, and expire", () => {
  assert.match(actions, /assertVenueInScope\(parsed\.data\.venue_id\)/);
  assert.match(actions, /assertAlertActionable\(alertId\)/);
  assert.match(editPage, /assertVenueInScope\(current\.venueId\)/);
  assert.match(editPage, /assertVenueInScope\(parsed\.data\.venue_id\)/);
  assert.match(service, /organization_id: organizationId/);
  assert.match(newForm, /Family and public/);
  assert.match(editPage, /Family and public/);
});

test("Venue public status is published through the canonical venue row with scoped authorization", () => {
  assert.match(placesService, /from\("venues"\)[\s\S]+public_status/);
  assert.match(placesService, /requirePermission\(actor, "venue\.manage", "venue", input\.venueId\)/);
  assert.match(placesService, /family_venue\.status_published/);
  assert.match(placesAdmin, /Publish family status/);
  assert.match(placesAdmin, /venueInScope\(actingCtx, target\)/);
});
