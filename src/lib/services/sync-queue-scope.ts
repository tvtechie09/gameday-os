export type SyncQueueFieldTarget = {
  id: string;
  venueId: string;
};

export function syncQueueFieldScopeError(requestedFieldIds: string[], fields: SyncQueueFieldTarget[]): string | null {
  if (requestedFieldIds.length === 0) return null;
  const normalizedIds = requestedFieldIds.map((id) => id.trim()).filter(Boolean);
  if (normalizedIds.length !== requestedFieldIds.length) {
    return "Every sync record requires a canonical field target.";
  }
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  for (const fieldId of new Set(normalizedIds)) {
    if (!fieldsById.has(fieldId)) return "A sync field target is not available.";
  }
  return null;
}

export function syncQueueSourceVenueError(sourceVenueId: string, fields: SyncQueueFieldTarget[]): string | null {
  return fields.some((field) => field.venueId !== sourceVenueId)
    ? "A sync field target is outside the external source venue."
    : null;
}
