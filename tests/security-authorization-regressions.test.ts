import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { automationTargetScopeError } from "../src/lib/services/automation-target-scope.ts";

const venueWorkflow = {
  fieldId: null,
  organizationId: "org-a",
  scopeId: "venue-a",
  scopeType: "venue" as const,
  tournamentId: null,
  venueId: "venue-a",
};

describe("high-risk authorization regressions", () => {
  it("allows canonical automation targets inside the workflow venue", () => {
    assert.equal(automationTargetScopeError(venueWorkflow, {
      fields: [{ id: "field-a", organizationId: "org-a", venueId: "venue-a" }],
      requestedFieldIds: ["field-a"],
      requestedSessionId: "session-a",
      requestedVenueId: "venue-a",
      session: { fieldId: "field-a", id: "session-a", organizationId: "org-a", tournamentId: null },
      venue: { id: "venue-a", organizationId: "org-a" },
    }), null);
  });

  it("denies cross-tenant automation field and venue targets", () => {
    const error = automationTargetScopeError(venueWorkflow, {
      fields: [{ id: "field-b", organizationId: "org-b", venueId: "venue-b" }],
      requestedFieldIds: ["field-b"],
      requestedSessionId: null,
      requestedVenueId: "venue-b",
      session: null,
      venue: { id: "venue-b", organizationId: "org-b" },
    });
    assert.match(error ?? "", /outside the workflow organization|outside the workflow venue/);
  });

  it("fails closed when an automation target cannot be loaded", () => {
    assert.match(automationTargetScopeError(venueWorkflow, {
      fields: [],
      requestedFieldIds: ["missing-field"],
      requestedSessionId: null,
      requestedVenueId: "venue-a",
      session: null,
      venue: { id: "venue-a", organizationId: "org-a" },
    }) ?? "", /do(?:es|) not exist/);
  });

  it("denies tournament field mutations without a canonical organization or venue boundary", () => {
    assert.match(automationTargetScopeError({
      fieldId: null,
      organizationId: null,
      scopeId: "tournament-a",
      scopeType: "tournament",
      tournamentId: "tournament-a",
      venueId: null,
    }, {
      fields: [{ id: "field-b", organizationId: "org-b", venueId: "venue-b" }],
      requestedFieldIds: ["field-b"],
      requestedSessionId: null,
      requestedVenueId: null,
      session: null,
      venue: null,
    }) ?? "", /outside the authorized tournament scope/);
  });

  it("guards Identity routes and privileged loaders with actor scope", () => {
    const layout = readFileSync("src/app/admin/identity/layout.tsx", "utf8");
    const identity = readFileSync("src/lib/services/identity.ts", "utf8");
    const identityPlatform = readFileSync("src/lib/services/identity-platform.ts", "utf8");
    assert.match(layout, /canManageUsers/);
    assert.match(identity, /authorizeIdentityRead/);
    assert.match(identity, /requirePermission\(actor, "identity\.role\.manage", scope\.scopeType, scope\.scopeId\)/);
    assert.match(identity, /eq\("scope_type", scope\.scopeType\)\.eq\("scope_id", scope\.scopeId\)/);
    assert.match(identityPlatform, /requirePermission\(actor, "identity\.role\.manage", scope\.scopeType, scope\.scopeId\)/);
  });

  it("requires trusted resource actors and canonical venue-field targets", () => {
    const resources = readFileSync("src/lib/services/resources.ts", "utf8");
    const action = readFileSync("src/app/admin/resources/actions.ts", "utf8");
    assert.match(action, /resolveSession\(\)/);
    assert.match(resources, /canManageDevices\(actor\)/);
    assert.match(resources, /venueInScope\(actor/);
    assert.match(resources, /eq\("venue_id", venue\.id\)/);
    assert.doesNotMatch(resources, /getWritableOrganizationId/);
  });

  it("makes workflow tests dry-run only after canonical target authorization", () => {
    const workflows = readFileSync("src/lib/services/automation-workflows.ts", "utf8");
    const authorizeIndex = workflows.indexOf("await authorizeAutomationTargets(workflow, triggerPayload)");
    const runInsertIndex = workflows.indexOf('from("automation_runs").insert', authorizeIndex);
    assert.ok(authorizeIndex >= 0 && runInsertIndex > authorizeIndex);
    assert.match(workflows, /executeAutomationAction\(workflow, action, run\.id, triggerPayload, true\)/);
    assert.match(workflows, /no field was changed/);
    assert.match(workflows, /no alert was created/);
    assert.match(workflows, /no event was recorded/);
  });

  it("guards and tenant-scopes the executive dashboard", () => {
    const executive = readFileSync("src/app/admin/executive/page.tsx", "utf8");
    const navigation = readFileSync("src/lib/access/navigation.ts", "utf8");
    assert.match(executive, /canManageVenueSettings\(ctx\)/);
    assert.match(executive, /getScopedVenuesAndFields\(\)/);
    assert.match(executive, /allSessions\.filter\(\(session\) => fieldIds\.has\(session\.fieldId\)\)/);
    assert.match(executive, /allActiveAlerts\.filter\(\(alert\) => venueIds\.has\(alert\.venueId\)\)/);
    assert.match(navigation, /prefix: "\/admin\/executive"/);
  });
});
