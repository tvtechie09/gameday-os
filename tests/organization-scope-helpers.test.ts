import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildScopeSwitcherGroups,
  describeScopeSelection,
  normalizeScopeSelection,
  parseScopeValue,
  resolveScopeOrganizationId,
  resolveScopeVenueId,
  serializeScopeValue,
  type ScopeOrganizationLike,
  type ScopeVenueLike,
} from "../src/lib/organization-scope-helpers.ts";

const organizations: ScopeOrganizationLike[] = [
  { id: "org-celtics", name: "Illinois Celtics" },
];

const venues: ScopeVenueLike[] = [
  { id: "venue-crossroads", name: "Crossroads", organizationId: "org-celtics" },
  { id: "venue-manhattan", name: "Manhattan Junior High", organizationId: "org-celtics" },
  { id: "venue-test", name: "Test Venue Edit", organizationId: null },
];

describe("parseScopeValue", () => {
  it("treats empty and 'all' as the all-organizations scope", () => {
    assert.deepEqual(parseScopeValue(undefined), { type: "all" });
    assert.deepEqual(parseScopeValue(""), { type: "all" });
    assert.deepEqual(parseScopeValue("all"), { type: "all" });
  });

  it("parses prefixed organization and venue values", () => {
    assert.deepEqual(parseScopeValue("org:org-celtics"), { type: "organization", organizationId: "org-celtics" });
    assert.deepEqual(parseScopeValue("venue:venue-test"), { type: "venue", venueId: "venue-test" });
  });

  it("treats a bare id as a legacy organization scope", () => {
    assert.deepEqual(parseScopeValue("org-celtics"), { type: "organization", organizationId: "org-celtics" });
  });
});

describe("serializeScopeValue", () => {
  it("round-trips through parseScopeValue", () => {
    for (const value of ["all", "org:org-celtics", "venue:venue-test"]) {
      assert.equal(serializeScopeValue(parseScopeValue(value)), value);
    }
  });
});

describe("normalizeScopeSelection", () => {
  it("keeps selections that exist in live data", () => {
    assert.deepEqual(
      normalizeScopeSelection({ type: "organization", organizationId: "org-celtics" }, organizations, venues),
      { type: "organization", organizationId: "org-celtics" },
    );
    assert.deepEqual(
      normalizeScopeSelection({ type: "venue", venueId: "venue-test" }, organizations, venues),
      { type: "venue", venueId: "venue-test" },
    );
  });

  it("falls back to all-organizations for stale selections", () => {
    assert.deepEqual(
      normalizeScopeSelection({ type: "organization", organizationId: "org-new-lenox-baseball" }, organizations, venues),
      { type: "all" },
    );
    assert.deepEqual(
      normalizeScopeSelection({ type: "venue", venueId: "venue-missing" }, organizations, venues),
      { type: "all" },
    );
  });
});

describe("resolveScopeOrganizationId", () => {
  it("resolves a venue selection to its owning organization", () => {
    assert.equal(resolveScopeOrganizationId({ type: "venue", venueId: "venue-crossroads" }, venues), "org-celtics");
  });

  it("resolves an org-less venue selection to null", () => {
    assert.equal(resolveScopeOrganizationId({ type: "venue", venueId: "venue-test" }, venues), null);
  });

  it("returns the organization id for an organization selection", () => {
    assert.equal(resolveScopeOrganizationId({ type: "organization", organizationId: "org-celtics" }, venues), "org-celtics");
  });

  it("returns null for the all scope", () => {
    assert.equal(resolveScopeOrganizationId({ type: "all" }, venues), null);
  });
});

describe("resolveScopeVenueId", () => {
  it("returns the venue id only for venue selections", () => {
    assert.equal(resolveScopeVenueId({ type: "venue", venueId: "venue-test" }), "venue-test");
    assert.equal(resolveScopeVenueId({ type: "organization", organizationId: "org-celtics" }), null);
    assert.equal(resolveScopeVenueId({ type: "all" }), null);
  });
});

describe("buildScopeSwitcherGroups", () => {
  it("builds one group per organization with its venues plus an unlinked group", () => {
    const groups = buildScopeSwitcherGroups(organizations, venues);

    assert.equal(groups.length, 2);

    const celtics = groups[0];
    assert.equal(celtics.label, "Illinois Celtics");
    assert.deepEqual(
      celtics.options.map((option) => option.value),
      ["org:org-celtics", "venue:venue-crossroads", "venue:venue-manhattan"],
    );
    assert.equal(celtics.options[0].label, "Illinois Celtics (all venues)");

    const unlinked = groups[1];
    assert.equal(unlinked.label, "Unlinked venues");
    assert.deepEqual(
      unlinked.options.map((option) => option.value),
      ["venue:venue-test"],
    );
  });

  it("omits the unlinked group when every venue has an organization", () => {
    const groups = buildScopeSwitcherGroups(organizations, [venues[0]]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].label, "Illinois Celtics");
  });

  it("does not surface stale hardcoded organizations", () => {
    const labels = buildScopeSwitcherGroups(organizations, venues).map((group) => group.label);
    assert.ok(!labels.some((label) => label.includes("New Lenox")));
  });
});

describe("describeScopeSelection", () => {
  it("describes organizations, venues, and the all scope", () => {
    assert.equal(describeScopeSelection({ type: "organization", organizationId: "org-celtics" }, organizations, venues), "Illinois Celtics");
    assert.equal(describeScopeSelection({ type: "venue", venueId: "venue-test" }, organizations, venues), "Test Venue Edit");
    assert.equal(describeScopeSelection({ type: "all" }, organizations, venues), "All Organizations");
  });
});
