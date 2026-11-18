import type { AutomationWorkflow } from "@/lib/automation-engine";

export type AutomationVenueTarget = { id: string; organizationId: string | null };
export type AutomationFieldTarget = { id: string; venueId: string; organizationId: string | null };
export type AutomationSessionTarget = { id: string; fieldId: string; tournamentId: string | null; organizationId: string | null };

export type AutomationCanonicalTargets = {
  requestedVenueId: string | null;
  requestedFieldIds: string[];
  requestedSessionId: string | null;
  venue: AutomationVenueTarget | null;
  fields: AutomationFieldTarget[];
  session: AutomationSessionTarget | null;
};

export function automationTargetScopeError(
  workflow: Pick<AutomationWorkflow, "scopeType" | "scopeId" | "organizationId" | "venueId" | "fieldId" | "tournamentId">,
  targets: AutomationCanonicalTargets,
): string | null {
  if (targets.requestedVenueId && targets.venue?.id !== targets.requestedVenueId) return "The requested venue target does not exist.";
  if (targets.requestedSessionId && targets.session?.id !== targets.requestedSessionId) return "The requested session target does not exist.";

  const loadedFieldIds = new Set(targets.fields.map((field) => field.id));
  if (targets.requestedFieldIds.some((id) => !loadedFieldIds.has(id))) return "One or more requested field targets do not exist.";
  if (targets.session && !loadedFieldIds.has(targets.session.fieldId)) return "The session field target does not exist.";

  const venueIds = new Set(targets.fields.map((field) => field.venueId));
  if (targets.venue) venueIds.add(targets.venue.id);
  const organizationIds = new Set([
    ...targets.fields.map((field) => field.organizationId),
    targets.venue?.organizationId ?? null,
    targets.session?.organizationId ?? null,
  ].filter((id): id is string => Boolean(id)));

  if (workflow.organizationId && [...organizationIds].some((id) => id !== workflow.organizationId)) {
    return "An automation target is outside the workflow organization.";
  }
  if (workflow.venueId && [...venueIds].some((id) => id !== workflow.venueId)) {
    return "An automation target is outside the workflow venue.";
  }
  if (workflow.fieldId && targets.fields.some((field) => field.id !== workflow.fieldId)) {
    return "An automation target is outside the workflow field.";
  }
  if (workflow.tournamentId && targets.session && targets.session.tournamentId !== workflow.tournamentId) {
    return "The session target is outside the workflow tournament.";
  }
  if (workflow.scopeType === "tournament" && workflow.tournamentId && workflow.tournamentId !== workflow.scopeId) {
    return "The workflow tournament does not match its authorization scope.";
  }

  switch (workflow.scopeType) {
    case "platform":
      return null;
    case "organization":
      return [...organizationIds].every((id) => id === workflow.scopeId)
        ? null
        : "An automation target is outside the authorized organization scope.";
    case "venue":
      return [...venueIds].every((id) => id === workflow.scopeId)
        ? null
        : "An automation target is outside the authorized venue scope.";
    case "field":
      return targets.fields.every((field) => field.id === workflow.scopeId)
        && (!targets.session || targets.session.fieldId === workflow.scopeId)
        && (!targets.venue || targets.fields.every((field) => field.venueId === targets.venue?.id))
        ? null
        : "An automation target is outside the authorized field scope.";
    case "tournament":
      return (!targets.session || targets.session.tournamentId === workflow.scopeId)
        && ((targets.requestedFieldIds.length === 0 && !targets.requestedVenueId) || Boolean(workflow.organizationId || workflow.venueId))
        ? null
        : "The session target is outside the authorized tournament scope.";
    case "session":
    case "game":
      return targets.session?.id === workflow.scopeId
        && targets.fields.every((field) => field.id === targets.session?.fieldId)
        && (!targets.venue || targets.fields.every((field) => field.venueId === targets.venue?.id))
        ? null
        : "The session target is outside the authorized session scope.";
    default:
      return "This workflow scope cannot authorize operational targets.";
  }
}
