export type IntegrationConnectionScopeInput = {
  organizationId?: string | null;
  tournamentId?: string | null;
  venueId?: string | null;
};

export type IntegrationConnectionScopeTargets = {
  organization: { id: string } | null;
  tournament: { id: string; organizationId: string | null } | null;
  venue: { id: string; organizationId: string | null } | null;
};

export type CanonicalIntegrationConnectionScope = {
  organizationId: string | null;
  tournamentId: string | null;
  venueId: string | null;
};

type IntegrationConnectionScopeResult =
  | { error: string; scope: null }
  | { error: null; scope: CanonicalIntegrationConnectionScope };

function normalizeId(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

export function canonicalizeIntegrationConnectionScope(
  input: IntegrationConnectionScopeInput,
  targets: IntegrationConnectionScopeTargets,
): IntegrationConnectionScopeResult {
  const organizationId = normalizeId(input.organizationId);
  const tournamentId = normalizeId(input.tournamentId);
  const venueId = normalizeId(input.venueId);

  if (venueId && tournamentId) {
    return { error: "An integration connection cannot span both venue and tournament scopes.", scope: null };
  }

  if (venueId) {
    if (!targets.venue || targets.venue.id !== venueId) {
      return { error: "The requested integration scope is not available.", scope: null };
    }
    if (organizationId && (!targets.organization || targets.organization.id !== organizationId || targets.venue.organizationId !== organizationId)) {
      return { error: "The requested venue is outside the submitted organization.", scope: null };
    }
    return {
      error: null,
      scope: { organizationId: targets.venue.organizationId, tournamentId: null, venueId },
    };
  }

  if (tournamentId) {
    if (!targets.tournament || targets.tournament.id !== tournamentId) {
      return { error: "The requested integration scope is not available.", scope: null };
    }
    if (organizationId && (!targets.organization || targets.organization.id !== organizationId || targets.tournament.organizationId !== organizationId)) {
      return { error: "The requested tournament is outside the submitted organization.", scope: null };
    }
    return {
      error: null,
      scope: { organizationId: targets.tournament.organizationId, tournamentId, venueId: null },
    };
  }

  if (organizationId) {
    if (!targets.organization || targets.organization.id !== organizationId) {
      return { error: "The requested integration scope is not available.", scope: null };
    }
    return { error: null, scope: { organizationId, tournamentId: null, venueId: null } };
  }

  return { error: "An integration connection requires a canonical organization, venue, or tournament scope.", scope: null };
}
