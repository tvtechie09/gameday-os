import type { Field, FieldStatus } from "../types.ts";
import { getField, updateFieldStatus } from "./fields.ts";
import { assertActorUserId, requirePermission } from "./identity.ts";

export type WeatherSafetyFieldProjectionResult = {
  field: Field;
  mutated: boolean;
};

/**
 * Projects a Weather & Safety field status without creating duplicate field
 * mutations/audit events when the requested status is already satisfied.
 *
 * Authorization is enforced even for a no-op so a caller cannot use an
 * already-matching status to bypass the venue.field.manage boundary.
 */
export async function ensureWeatherSafetyFieldStatus(
  fieldId: string,
  status: FieldStatus,
  actorUserId?: string | null,
): Promise<WeatherSafetyFieldProjectionResult> {
  const actor = assertActorUserId(actorUserId);
  const existingField = await getField(fieldId);

  if (!existingField) {
    throw new Error(`Field ${fieldId} was not found.`);
  }

  await requirePermission(actor, "venue.field.manage", "venue", existingField.venueId);

  if (existingField.status === status) {
    return { field: existingField, mutated: false };
  }

  const field = await updateFieldStatus(fieldId, status, actor);
  return { field, mutated: true };
}
