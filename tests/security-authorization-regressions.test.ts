import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { automationTargetScopeError } from "../src/lib/services/automation-target-scope.ts";
import { buildAccessContext } from "../src/lib/access/capabilities.ts";
import { guardForAdminPath } from "../src/lib/access/navigation.ts";

const venueWorkflow = {
  fieldId: null,
  organizationId: "org-a",
  scopeId: "venue-a",
  scopeType: "venue" as const,
  tournamentId: null,
  venueId: "venue-a",
};

describe("high-risk authorization regressions", () => {
  it("denies direct admin URLs when the caller lacks the route capability", () => {
    const venueStaff = buildAccessContext({
      displayName: "Venue Staff",
      email: "staff@example.test",
      permissions: ["venue.field.manage", "game.status.update"],
      roleKey: "venue_staff",
      scopeId: "venue-a",
      scopeType: "venue",
      userId: "user-a",
      venueId: "venue-a",
    });
    assert.equal(guardForAdminPath("/admin/command-center")(venueStaff), true);
    assert.equal(guardForAdminPath("/admin/identity/people")(venueStaff), false);
    assert.equal(guardForAdminPath("/admin/sessions")(venueStaff), false);
    assert.equal(guardForAdminPath("/admin/ai")(venueStaff), true);
    assert.equal(guardForAdminPath("/admin/unregistered-future-page")(venueStaff), false);
  });

  it("denies revoked route capabilities even when the role catalog normally grants them", () => {
    const revokedDirector = buildAccessContext({
      displayName: "Revoked Director",
      email: "director@example.test",
      permissions: [],
      roleKey: "venue_director",
      scopeId: "venue-a",
      scopeType: "venue",
      userId: "user-a",
      venueId: "venue-a",
    });
    assert.equal(guardForAdminPath("/admin/venues")(revokedDirector), false);
    assert.equal(guardForAdminPath("/admin/resources")(revokedDirector), false);
  });

  it("requires every admin page to be registered with the fail-closed route guard", () => {
    const platformAdmin = buildAccessContext({
      displayName: "Platform Admin",
      email: "admin@example.test",
      roleKey: "platform_admin",
      scopeId: "platform",
      scopeType: "platform",
      userId: "admin-a",
    });
    const pages = readdirSync("src/app/admin", { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name === "page.tsx")
      .map((entry) => {
        const relative = `${entry.parentPath}/page.tsx`.replace("src/app", "").replace(/\/page\.tsx$/, "");
        return relative || "/admin";
      });
    for (const page of pages) {
      assert.equal(guardForAdminPath(page)(platformAdmin), true, `${page} is missing an admin route guard`);
    }
  });

  it("wires the canonical admin pathname into the server capability gate", () => {
    const middleware = readFileSync("src/middleware.ts", "utf8");
    const frame = readFileSync("src/components/access/app-frame.tsx", "utf8");
    assert.match(middleware, /requestHeaders\.set\("x-gameday-admin-path", request\.nextUrl\.pathname\)/);
    assert.match(frame, /guardForAdminPath\(pathname\)\(ctx\)/);
  });

  it("keeps the operator-linked AI route tenant scoped", () => {
    const ai = readFileSync("src/app/admin/ai/page.tsx", "utf8");
    assert.match(ai, /getScopedVenuesAndFields/);
    assert.match(ai, /allSessions\.filter\(\(session\) => fieldIds\.has\(session\.fieldId\)\)/);
    assert.match(ai, /allAlerts\.filter\(\(alert\) => venueIds\.has\(alert\.venueId\)\)/);
    assert.match(ai, /allResources\.filter\(\(resource\) => venueIds\.has\(resource\.venueId\)\)/);
  });

  it("rejects inactive hosted users and treats live permission grants as authoritative", () => {
    const session = readFileSync("src/lib/access/session.ts", "utf8");
    assert.match(session, /userRow\.user_status !== "active"/);
    assert.match(session, /if \(live === null\)[\s\S]*return \{ kind: "no-access"/);
    assert.match(session, /permissions: live/);
    assert.doesNotMatch(session, /for \(const key of activeRoleKeys\)[\s\S]*permissionsForRole\(key\)/);
  });

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
