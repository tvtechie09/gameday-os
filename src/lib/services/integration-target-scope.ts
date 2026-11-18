export type IntegrationConnectionTarget = {
  organizationId: string | null;
  providerKey: string;
  tournamentId: string | null;
  venueId: string | null;
};

export type IntegrationFieldTarget = {
  id: string;
  organizationId: string | null;
  venueId: string;
};

export function integrationFieldMappingScopeError(
  connection: IntegrationConnectionTarget,
  field: IntegrationFieldTarget | null,
  requested: { organizationId?: string | null; venueId?: string | null },
): string | null {
  if (connection.providerKey !== "sportsengine") {
    return "The requested connection is not a SportsEngine connection.";
  }
  if (!connection.venueId) {
    return "The SportsEngine connection is missing a canonical venue scope.";
  }
  if (!field) {
    return "The requested field does not exist.";
  }
  if (field.venueId !== connection.venueId) {
    return "The requested field is outside the connection venue.";
  }
  if (connection.organizationId && field.organizationId !== connection.organizationId) {
    return "The requested field is outside the connection organization.";
  }
  if (requested.venueId && requested.venueId !== field.venueId) {
    return "The submitted venue does not match the field's canonical venue.";
  }
  if (requested.organizationId && requested.organizationId !== field.organizationId) {
    return "The submitted organization does not match the field's canonical organization.";
  }
  return null;
}
