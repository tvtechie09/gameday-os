import assert from "node:assert/strict";
import test from "node:test";
import { buildAccessContext, managesAllVenues, venueInScope } from "../src/lib/access/capabilities.ts";

const base = { userId: "u", email: "e", displayName: "d" };
const wintrust = { id: "a8235a4f-c5bf-4f79-b527-853d15f6ae17", name: "Wintrust Crossroads Sports Complex" };
const otherVenue = { id: "d15ce9df-4803-44a6-b838-f4eb853a104c", name: "Another Sports Complex" };

test("platform admin manages and sees every venue", () => {
  const ctx = buildAccessContext({ ...base, roleKey: "platform_admin", scopeType: "platform", scopeId: "00000000-0000-0000-0000-000000000000" });
  assert.equal(managesAllVenues(ctx), true);
  assert.equal(venueInScope(ctx, wintrust), true);
  assert.equal(venueInScope(ctx, otherVenue), true);
});

test("venue-scoped role (prod: scopeId is the venue id) is limited to its venue", () => {
  const ctx = buildAccessContext({ ...base, roleKey: "venue_director", scopeType: "venue", scopeId: wintrust.id });
  assert.equal(managesAllVenues(ctx), false);
  assert.equal(venueInScope(ctx, wintrust), true);
  assert.equal(venueInScope(ctx, otherVenue), false);
});

test("venue-scoped role (dev: scopeId is a name slug) matches only its venue", () => {
  const ctx = buildAccessContext({ ...base, roleKey: "venue_director", scopeType: "venue", scopeId: "wintrust-crossroads-sports-complex" });
  assert.equal(venueInScope(ctx, wintrust), true);
  assert.equal(venueInScope(ctx, otherVenue), false);
});

test("null context is denied", () => {
  assert.equal(venueInScope(null, wintrust), false);
  assert.equal(managesAllVenues(null), false);
});

test("org scope does NOT manage all venues -- it manages only venues it owns", () => {
  // Manhattan Junior High: an OWNING org, owns wintrust in this scenario.
  const owner = buildAccessContext({ ...base, roleKey: "organization_admin", scopeType: "organization", scopeId: "org-manhattan" });
  assert.equal(managesAllVenues(owner), false);
  assert.equal(venueInScope(owner, { ...wintrust, organizationId: "org-manhattan" }), true);
  assert.equal(venueInScope(owner, { ...otherVenue, organizationId: "org-other" }), false);
});

test("a using org (owns no venue) sees none in venue scope -- it gets reservations instead", () => {
  // Illinois Celtics: uses fields elsewhere, owns nothing.
  const usingOrg = buildAccessContext({ ...base, roleKey: "organization_admin", scopeType: "organization", scopeId: "org-celtics" });
  assert.equal(venueInScope(usingOrg, { ...wintrust, organizationId: "org-manhattan" }), false);
  assert.equal(venueInScope(usingOrg, { ...otherVenue, organizationId: null }), false);
});
