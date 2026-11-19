import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { canonicalizeIntegrationConnectionScope } from "../src/lib/services/integration-connection-scope.ts";

const targets = {
  organization: { id: "org-a" },
  tournament: { id: "tournament-a", organizationId: "org-a" },
  venue: { id: "venue-a", organizationId: "org-a" },
};

describe("integration connection scope canonicalization", () => {
  it("uses the venue's canonical organization for a legitimate venue connection", () => {
    assert.deepEqual(canonicalizeIntegrationConnectionScope({ venueId: "venue-a" }, targets), {
      error: null,
      scope: { organizationId: "org-a", tournamentId: null, venueId: "venue-a" },
    });
    assert.deepEqual(canonicalizeIntegrationConnectionScope({ organizationId: "org-a", venueId: "venue-a" }, targets), {
      error: null,
      scope: { organizationId: "org-a", tournamentId: null, venueId: "venue-a" },
    });
  });

  it("uses the tournament's canonical organization for a legitimate tournament connection", () => {
    assert.deepEqual(canonicalizeIntegrationConnectionScope({ tournamentId: "tournament-a" }, targets), {
      error: null,
      scope: { organizationId: "org-a", tournamentId: "tournament-a", venueId: null },
    });
  });

  it("denies foreign organization ids paired with otherwise valid child scopes", () => {
    const foreignOrganization = { ...targets, organization: { id: "org-b" } };
    assert.match(canonicalizeIntegrationConnectionScope({ organizationId: "org-b", venueId: "venue-a" }, foreignOrganization).error ?? "", /outside the submitted organization/);
    assert.match(canonicalizeIntegrationConnectionScope({ organizationId: "org-b", tournamentId: "tournament-a" }, foreignOrganization).error ?? "", /outside the submitted organization/);
  });

  it("denies mixed, missing, and nonexistent scopes", () => {
    assert.match(canonicalizeIntegrationConnectionScope({ venueId: "venue-a", tournamentId: "tournament-a" }, targets).error ?? "", /cannot span both/);
    assert.match(canonicalizeIntegrationConnectionScope({}, { organization: null, tournament: null, venue: null }).error ?? "", /requires a canonical/);
    assert.match(canonicalizeIntegrationConnectionScope({ venueId: "venue-missing" }, { ...targets, venue: null }).error ?? "", /not available/);
    assert.match(canonicalizeIntegrationConnectionScope({ organizationId: "org-missing" }, { ...targets, organization: null }).error ?? "", /not available/);
  });

  it("trims ids and persists only the resolved canonical scope", () => {
    assert.deepEqual(canonicalizeIntegrationConnectionScope({ organizationId: " org-a ", venueId: " venue-a " }, targets), {
      error: null,
      scope: { organizationId: "org-a", tournamentId: null, venueId: "venue-a" },
    });
    const service = readFileSync("src/lib/services/integration-framework.ts", "utf8");
    assert.match(service, /const scope = await resolveCanonicalConnectionScope\(input\)/);
    assert.match(service, /organization_id: scope\.organizationId/);
    assert.match(service, /tournament_id: scope\.tournamentId/);
    assert.match(service, /venue_id: scope\.venueId/);
    assert.doesNotMatch(service, /organization_id: input\.organizationId/);
    assert.doesNotMatch(service, /tournament_id: input\.tournamentId/);
    assert.doesNotMatch(service, /venue_id: input\.venueId/);
  });
});
