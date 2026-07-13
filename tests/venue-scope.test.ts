import assert from "node:assert/strict";
import test from "node:test";
import { buildAccessContext, managesAllVenues, venueInScope } from "../src/lib/access/capabilities.ts";

const base = { userId: "u", email: "e", displayName: "d" };
const wintrust = { id: "a8235a4f-c5bf-4f79-b527-853d15f6ae17", name: "Wintrust Crossroads Sports Complex" };
const crossroads = { id: "d15ce9df-4803-44a6-b838-f4eb853a104c", name: "Crossroads Test Complex" };

test("platform admin manages and sees every venue", () => {
  const ctx = buildAccessContext({ ...base, roleKey: "platform_admin", scopeType: "platform", scopeId: "00000000-0000-0000-0000-000000000000" });
  assert.equal(managesAllVenues(ctx), true);
  assert.equal(venueInScope(ctx, wintrust), true);
  assert.equal(venueInScope(ctx, crossroads), true);
});

test("venue-scoped role (prod: scopeId is the venue id) is limited to its venue", () => {
  const ctx = buildAccessContext({ ...base, roleKey: "venue_director", scopeType: "venue", scopeId: wintrust.id });
  assert.equal(managesAllVenues(ctx), false);
  assert.equal(venueInScope(ctx, wintrust), true);
  assert.equal(venueInScope(ctx, crossroads), false);
});

test("venue-scoped role (dev: scopeId is a name slug) matches only its venue", () => {
  const ctx = buildAccessContext({ ...base, roleKey: "venue_director", scopeType: "venue", scopeId: "crossroads-test-complex" });
  assert.equal(venueInScope(ctx, crossroads), true);
  assert.equal(venueInScope(ctx, wintrust), false);
});

test("null context is denied", () => {
  assert.equal(venueInScope(null, wintrust), false);
  assert.equal(managesAllVenues(null), false);
});
