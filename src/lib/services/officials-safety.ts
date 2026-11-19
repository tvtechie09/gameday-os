import { canManageSchedule, venueInScope, type AccessContext } from "../access/capabilities.ts";

export type OfficialDeliveryStatus = "sent" | "failed" | "not_configured" | "not_requested";

export function classifyOfficialDelivery(
  email: string | null,
  result?: { sent: boolean; provider: string },
): OfficialDeliveryStatus {
  if (!email) return "not_requested";
  if (result?.sent) return "sent";
  return result?.provider ? "failed" : "not_configured";
}

export function officialSessionScopeError(
  ctx: AccessContext | null,
  session: { tournamentId?: string | null },
  venue: { id: string; name: string; organizationId?: string | null } | null,
): string | null {
  if (!canManageSchedule(ctx)) return "You do not have permission to manage officials.";
  if (ctx?.scopeType === "tournament") {
    return session.tournamentId === ctx.scopeId ? null : "That game is outside your tournament scope.";
  }
  return venue && venueInScope(ctx, venue) ? null : "That game is outside your venue scope.";
}
