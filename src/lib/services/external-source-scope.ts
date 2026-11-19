export type ExternalSourceFieldTarget = {
  id: string;
  venueId: string;
};

export function externalSourceImportScopeError(
  sourceVenueId: string,
  requestedFieldIds: string[],
  fields: ExternalSourceFieldTarget[],
): string | null {
  const normalizedIds = requestedFieldIds.map((id) => id.trim()).filter(Boolean);
  if (normalizedIds.length !== requestedFieldIds.length) {
    return "Every imported row requires a canonical field target.";
  }
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  for (const fieldId of new Set(normalizedIds)) {
    const field = fieldsById.get(fieldId);
    if (!field) return "An imported field target is not available.";
    if (field.venueId !== sourceVenueId) return "An imported field is outside the external source venue.";
  }
  return null;
}
