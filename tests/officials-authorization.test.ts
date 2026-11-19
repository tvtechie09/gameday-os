import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildAccessContext } from "../src/lib/access/capabilities.ts";
import { sessionInScheduleScope } from "../src/lib/access/scoped-session-scope.ts";
import { classifyOfficialDelivery, officialConflictLabel, officialSessionScopeError } from "../src/lib/services/officials-safety.ts";

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
  email: "director@example.test",
  roleKey: "tournament_director",
  scopeId: "tournament-a",
  scopeType: "tournament",
  userId: "director-b",
});

describe("official assignment authorization and delivery truth", () => {
  it("scopes official reads to the caller's canonical venue or tournament", () => {
    assert.equal(sessionInScheduleScope(venueDirector, { fieldId: "field-a", tournamentId: null }, new Set(["field-a"])), true);
    assert.equal(sessionInScheduleScope(venueDirector, { fieldId: "field-b", tournamentId: null }, new Set(["field-a"])), false);
    assert.equal(sessionInScheduleScope(tournamentDirector, { fieldId: "field-b", tournamentId: "tournament-a" }, new Set()), true);
    assert.equal(sessionInScheduleScope(tournamentDirector, { fieldId: "field-a", tournamentId: "tournament-b" }, new Set()), false);
  });

  it("denies cross-tenant official mutations before a service-role write", () => {
    const ownVenue = { id: "venue-a", name: "Venue A", organizationId: "org-a" };
    const foreignVenue = { id: "venue-b", name: "Venue B", organizationId: "org-b" };
    assert.equal(officialSessionScopeError(venueDirector, { tournamentId: null }, ownVenue), null);
    assert.match(officialSessionScopeError(venueDirector, { tournamentId: null }, foreignVenue) ?? "", /outside your venue scope/);
    assert.equal(officialSessionScopeError(tournamentDirector, { tournamentId: "tournament-a" }, foreignVenue), null);
    assert.match(officialSessionScopeError(tournamentDirector, { tournamentId: "tournament-b" }, ownVenue) ?? "", /outside your tournament scope/);
    assert.match(officialSessionScopeError(null, { tournamentId: null }, ownVenue) ?? "", /do not have permission/);
  });

  it("reports the actual confirmation-email outcome", () => {
    assert.equal(classifyOfficialDelivery(null), "not_requested");
    assert.equal(classifyOfficialDelivery("official@example.test", { sent: true, provider: "resend" }), "sent");
    assert.equal(classifyOfficialDelivery("official@example.test", { sent: false, provider: "resend" }), "failed");
    assert.equal(classifyOfficialDelivery("official@example.test", { sent: false, provider: "" }), "not_configured");
  });

  it("does not disclose foreign session or team labels in conflict warnings", () => {
    assert.equal(officialConflictLabel("Falcons vs Tigers", null), "Falcons vs Tigers");
    assert.equal(
      officialConflictLabel("Foreign Academy vs Private Club", "That game is outside your venue scope."),
      "Another assignment at this time",
    );
  });

  it("passes the verified actor into both official mutation boundaries", () => {
    const actions = readFileSync("src/app/admin/sessions/officials/actions.ts", "utf8");
    const service = readFileSync("src/lib/services/officials.ts", "utf8");
    const page = readFileSync("src/app/admin/sessions/officials/page.tsx", "utf8");
    assert.match(actions, /assignOfficial\([\s\S]*, actor\)/);
    assert.match(actions, /removeOfficial\(id, await getSessionContext\(\)\)/);
    assert.match(service, /await requireOfficialSessionMutation\(actor, input\.sessionId\)/);
    assert.match(service, /await requireOfficialSessionMutation\(actor, existing\.session_id\)/);
    assert.match(service, /findOfficialConflicts\(email, input\.sessionId, actor\)/);
    assert.match(service, /await conflictScopeError\(actor, session\)/);
    assert.match(page, /getScheduleSessionsInScope\(\)/);
  });
});
