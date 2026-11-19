import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { requiredGameStatePermissions, sessionGameStatePermissionScopes } from "../src/lib/access/session-game-state-scope.ts";

const session = {
  id: "session-a",
  fieldId: "field-a",
  playSurfaceId: "surface-a",
  tournamentId: "tournament-a",
};

describe("staff game-state actor authorization", () => {
  it("separates status-only controls from score edits and requires both for combined changes", () => {
    assert.deepEqual(requiredGameStatePermissions({ scoreStateChanged: false, statusChanged: true }), ["game.status.update"]);
    assert.deepEqual(requiredGameStatePermissions({ scoreStateChanged: true, statusChanged: false }), ["game.score.update"]);
    assert.deepEqual(requiredGameStatePermissions({ scoreStateChanged: true, statusChanged: true }), ["game.score.update", "game.status.update"]);
    assert.deepEqual(requiredGameStatePermissions({ scoreStateChanged: false, statusChanged: false }), ["game.score.update"]);
  });

  it("keeps score updates on platform, session, play-surface, or tournament assignments", () => {
    const scopes = sessionGameStatePermissionScopes(
      "game.score.update",
      session,
      "venue-a",
      { scopeType: "platform", scopeId: "platform-scope-a" },
    );
    assert.deepEqual(scopes, [
      { scopeType: "platform", scopeId: "platform-scope-a" },
      { scopeType: "session", scopeId: "session-a" },
      { scopeType: "game", scopeId: "session-a" },
      { scopeType: "play_surface", scopeId: "surface-a" },
      { scopeType: "tournament", scopeId: "tournament-a" },
    ]);
    assert.equal(scopes.some((scope) => scope.scopeType === "venue"), false);
    assert.equal(scopes.some((scope) => scope.scopeType === "field"), false);
  });

  it("allows status-only control at canonical venue and field scopes", () => {
    const scopes = sessionGameStatePermissionScopes(
      "game.status.update",
      session,
      "venue-a",
      { scopeType: "venue", scopeId: "venue-a" },
    );
    assert.equal(scopes.some((scope) => scope.scopeType === "venue" && scope.scopeId === "venue-a"), true);
    assert.equal(scopes.some((scope) => scope.scopeType === "field" && scope.scopeId === "field-a"), true);
    assert.equal(scopes.some((scope) => scope.scopeId === "venue-b"), false);
  });

  it("does not turn a non-platform actor scope into a platform candidate", () => {
    const scopes = sessionGameStatePermissionScopes(
      "game.score.update",
      { ...session, playSurfaceId: null, tournamentId: null },
      "venue-a",
      { scopeType: "venue", scopeId: "venue-a" },
    );
    assert.deepEqual(scopes, [
      { scopeType: "session", scopeId: "session-a" },
      { scopeType: "game", scopeId: "session-a" },
    ]);
  });

  it("passes trusted actors from every staff caller and authorizes before the write", () => {
    const action = readFileSync("src/app/admin/sessions/[sessionId]/actions.ts", "utf8");
    const fieldControl = readFileSync("src/app/admin/fields/[fieldId]/control/page.tsx", "utf8");
    const demoAction = readFileSync("src/app/admin/scoreboards/demo-actions.ts", "utf8");
    const service = readFileSync("src/lib/services/sessions.ts", "utf8");
    assert.match(action, /getSessionContext\(\)[\s\S]*updateSessionGameState\([\s\S]*actor,/);
    assert.match(fieldControl, /startControlledSessionAction[\s\S]*getSessionContext\(\)[\s\S]*updateSessionGameState\([\s\S]*actor\)/);
    assert.match(demoAction, /getSessionContext\(\)[\s\S]*applyDemoScoreboardAction\(session, action, actor\)/);
    const authorization = service.indexOf("await requireSessionGameStatePermission");
    const write = service.indexOf('.from("sessions")', authorization);
    assert.ok(authorization >= 0 && write > authorization);
  });
});
