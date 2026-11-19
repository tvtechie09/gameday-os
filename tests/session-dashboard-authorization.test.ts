import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildAccessContext } from "../src/lib/access/capabilities.ts";
import { sessionDashboardScopeError } from "../src/lib/access/session-dashboard-scope.ts";

const venueDirector = buildAccessContext({
  displayName: "Venue Director",
  email: "director@example.test",
  roleKey: "venue_director",
  scopeId: "venue-a",
  scopeType: "venue",
  userId: "director-a",
  venueId: "venue-a",
});

const tournamentDirector = buildAccessContext({
  displayName: "Tournament Director",
  email: "tournament@example.test",
  roleKey: "tournament_director",
  scopeId: "tournament-a",
  scopeType: "tournament",
  userId: "director-b",
});

describe("session dashboard authorization", () => {
  it("allows canonical venue and tournament sessions and denies foreign targets", () => {
    const ownVenue = { id: "venue-a", name: "Venue A", organizationId: "org-a" };
    const foreignVenue = { id: "venue-b", name: "Venue B", organizationId: "org-b" };
    assert.equal(sessionDashboardScopeError(venueDirector, { tournamentId: null }, ownVenue), null);
    assert.match(sessionDashboardScopeError(venueDirector, { tournamentId: null }, foreignVenue) ?? "", /outside your venue scope/);
    assert.equal(sessionDashboardScopeError(tournamentDirector, { tournamentId: "tournament-a" }, foreignVenue), null);
    assert.match(sessionDashboardScopeError(tournamentDirector, { tournamentId: "tournament-b" }, ownVenue) ?? "", /outside your tournament scope/);
    assert.match(sessionDashboardScopeError(null, { tournamentId: null }, ownVenue) ?? "", /do not have permission/);
  });

  it("authorizes before credential creation and repeats the check at the service boundary", () => {
    const page = readFileSync("src/app/admin/sessions/[sessionId]/page.tsx", "utf8");
    const service = readFileSync("src/lib/services/scorekeeper.ts", "utf8");
    const scopeCheck = page.indexOf("sessionDashboardScopeError(ctx, session, venue)");
    const credentialWrite = page.indexOf("ensureScorekeeperAccess(session.id, ctx)");
    assert.ok(scopeCheck >= 0 && credentialWrite > scopeCheck);
    assert.match(service, /ensureScorekeeperAccess\(sessionId: string, actor: AccessContext \| null\)/);
    assert.match(service, /await requireScorekeeperSessionAccess\(sessionId, actor\)/);
  });
});
