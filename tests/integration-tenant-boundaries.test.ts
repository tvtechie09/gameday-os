import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { integrationFieldMappingScopeError } from "../src/lib/services/integration-target-scope.ts";

const connection = {
  organizationId: "org-a",
  providerKey: "sportsengine",
  tournamentId: null,
  venueId: "venue-a",
};

describe("integration tenant boundaries", () => {
  it("allows a canonical field inside the authorized connection venue", () => {
    assert.equal(integrationFieldMappingScopeError(connection, {
      id: "field-a",
      organizationId: "org-a",
      venueId: "venue-a",
    }, { organizationId: "org-a", venueId: "venue-a" }), null);
  });

  it("denies a field from another venue or organization", () => {
    assert.match(integrationFieldMappingScopeError(connection, {
      id: "field-b",
      organizationId: "org-b",
      venueId: "venue-b",
    }, {}) ?? "", /outside the connection venue/);
    assert.match(integrationFieldMappingScopeError(connection, {
      id: "field-b",
      organizationId: "org-b",
      venueId: "venue-a",
    }, {}) ?? "", /outside the connection organization/);
  });

  it("denies caller-supplied scope values that disagree with canonical records", () => {
    assert.match(integrationFieldMappingScopeError(connection, {
      id: "field-a",
      organizationId: "org-a",
      venueId: "venue-a",
    }, { organizationId: "org-b", venueId: "venue-a" }) ?? "", /canonical organization/);
  });

  it("denies a non-SportsEngine connection and missing canonical targets", () => {
    assert.match(integrationFieldMappingScopeError({ ...connection, providerKey: "daktronics" }, {
      id: "field-a",
      organizationId: "org-a",
      venueId: "venue-a",
    }, {}) ?? "", /not a SportsEngine connection/);
    assert.match(integrationFieldMappingScopeError({ ...connection, venueId: null }, {
      id: "field-a",
      organizationId: "org-a",
      venueId: "venue-a",
    }, {}) ?? "", /missing a canonical venue scope/);
    assert.match(integrationFieldMappingScopeError(connection, null, {}) ?? "", /does not exist/);
  });

  it("authorizes exact connection ids before reads, logs, syncs, or mapping writes", () => {
    const framework = readFileSync("src/lib/services/integration-framework.ts", "utf8");
    const sportsEngine = readFileSync("src/lib/services/sportsengine-integration.ts", "utf8");
    assert.match(framework, /getAuthorizedIntegrationConnection/);
    assert.match(framework, /eq\("id", connectionId\)\.maybeSingle\(\)/);
    assert.match(sportsEngine, /getAuthorizedIntegrationConnection\(connectionId, actorUserId, "integrations\.view"\)/);
    assert.match(sportsEngine, /runIntegrationSync\("sportsengine"[\s\S]*connectionId\)/);
    assert.match(sportsEngine, /getIntegrationLogs\("sportsengine", actorUserId, connectionId\)/);
    assert.match(sportsEngine, /organization_id: field\?\.organization_id/);
    assert.match(sportsEngine, /venue_id: field\?\.venue_id/);
  });
});
