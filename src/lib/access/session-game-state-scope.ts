export type GameStatePermission = "game.score.update" | "game.status.update";

export type PermissionScope = {
  scopeType: string;
  scopeId: string;
};

export function requiredGameStatePermissions(change: {
  scoreStateChanged: boolean;
  statusChanged: boolean;
}): GameStatePermission[] {
  const permissions: GameStatePermission[] = [];
  if (change.scoreStateChanged || !change.statusChanged) permissions.push("game.score.update");
  if (change.statusChanged) permissions.push("game.status.update");
  return permissions;
}

type SessionTarget = {
  id: string;
  fieldId: string;
  playSurfaceId: string | null;
  tournamentId: string | null;
};

type ActorScope = {
  scopeType: string;
  scopeId: string;
};

function pushScope(scopes: PermissionScope[], scopeType: string, scopeId: string | null | undefined) {
  if (scopeId && !scopes.some((scope) => scope.scopeType === scopeType && scope.scopeId === scopeId)) {
    scopes.push({ scopeType, scopeId });
  }
}

// Keep authorization tied to the assignment that granted the permission. A
// broad role name or a permission aggregated from another assignment must not
// turn into access to every game. Each candidate is either the actor's actual
// platform scope or a canonical parent of this session.
export function sessionGameStatePermissionScopes(
  permission: GameStatePermission,
  session: SessionTarget,
  venueId: string | null,
  actorScope: ActorScope,
): PermissionScope[] {
  const scopes: PermissionScope[] = [];

  if (actorScope.scopeType === "platform") {
    pushScope(scopes, actorScope.scopeType, actorScope.scopeId);
  }
  pushScope(scopes, "session", session.id);
  pushScope(scopes, "game", session.id);
  pushScope(scopes, "play_surface", session.playSurfaceId);
  pushScope(scopes, "tournament", session.tournamentId);

  // Venue and field operators may change lifecycle status, but those broader
  // scopes never grant score/count/link editing. Scorekeepers remain bounded to
  // their session or play-surface assignment.
  if (permission === "game.status.update") {
    pushScope(scopes, "field", session.fieldId);
    pushScope(scopes, "venue", venueId);
  }

  return scopes;
}
