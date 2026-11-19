import { canManageSchedule, venueInScope, type AccessContext } from "./capabilities.ts";

export function sessionDashboardScopeError(
  ctx: AccessContext | null,
  session: { tournamentId?: string | null },
  venue: { id: string; name: string; organizationId?: string | null } | null,
): string | null {
  if (!canManageSchedule(ctx)) return "You do not have permission to manage this game.";
  if (ctx?.scopeType === "tournament") {
    return session.tournamentId === ctx.scopeId ? null : "That game is outside your tournament scope.";
  }
  return venue && venueInScope(ctx, venue) ? null : "That game is outside your venue scope.";
}
