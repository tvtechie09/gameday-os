"use server";

import { revalidatePath } from "next/cache";
import { canOpenCloseField } from "@/lib/access/capabilities";
import { assertFieldInScope } from "@/lib/access/scoped-venue-data";
import { getSessionContext } from "@/lib/access/session";
import { getField } from "@/lib/services/fields";
import { buildFieldDisruptionReview } from "@/lib/services/field-disruption-core";
import { executeRapidScheduleOperation } from "@/lib/services/schedule-operations";
import { getSession, getSessions } from "@/lib/services/sessions";
import { getVenue } from "@/lib/services/venues";
import { getWorkOrders } from "@/lib/services/work-orders";

export type MoveAffectedGameResult = {
  ok: boolean;
  message: string;
  originalFieldName?: string;
  newFieldName?: string;
};

export async function moveAffectedGameAction(input: {
  sessionId: string;
  originalFieldId: string;
  targetFieldId: string;
  startTime?: string;
}): Promise<MoveAffectedGameResult> {
  const ctx = await getSessionContext();
  if (!ctx || !canOpenCloseField(ctx)) return { ok: false, message: "You don't have permission to move games." };
  if (!input.sessionId || !input.originalFieldId || !input.targetFieldId || input.originalFieldId === input.targetFieldId) {
    return { ok: false, message: "Choose a different field." };
  }
  if (input.startTime && Number.isNaN(Date.parse(input.startTime))) return { ok: false, message: "Choose a valid start time." };

  try {
    await Promise.all([assertFieldInScope(input.originalFieldId), assertFieldInScope(input.targetFieldId)]);
    const [session, originalField, targetField, sessions, workOrders] = await Promise.all([
      getSession(input.sessionId),
      getField(input.originalFieldId),
      getField(input.targetFieldId),
      getSessions(),
      getWorkOrders(),
    ]);
    if (!session || session.fieldId !== input.originalFieldId) {
      return { ok: false, message: "This game has already moved. Return to the disruption review for the latest schedule." };
    }
    if (!originalField || !targetField || originalField.venueId !== targetField.venueId) {
      return { ok: false, message: "Games cannot move across venue boundaries." };
    }
    const venue = await getVenue(originalField.venueId);
    if (!venue) return { ok: false, message: "The venue is no longer available." };
    const review = buildFieldDisruptionReview({ field: originalField, venue, sessions, workOrders, now: Date.now() });
    const affectedIds = new Set([...review.inProgress, ...review.startingSoon, ...review.laterToday].map((game) => game.id));
    if (!affectedIds.has(session.id)) {
      return { ok: false, message: "This game is no longer affected by the field disruption." };
    }

    await executeRapidScheduleOperation({
      type: "move_game",
      sessionId: session.id,
      fieldId: targetField.id,
      startTime: input.startTime,
    }, ctx.userId);

    revalidatePath("/admin/fields");
    revalidatePath(`/admin/fields/${originalField.id}/disruption`);
    revalidatePath(`/admin/fields/${targetField.id}/disruption`);
    revalidatePath("/admin/sessions");
    revalidatePath(`/admin/sessions/${session.id}`);
    revalidatePath("/today");
    revalidatePath(`/fields/${originalField.id}`);
    revalidatePath(`/fields/${targetField.id}`);
    revalidatePath(`/venues/${venue.id}`);
    revalidatePath(`/display/venue/${venue.id}`);

    return {
      ok: true,
      message: `${session.title || `${session.homeTeam} vs ${session.awayTeam}`} moved from ${originalField.name} to ${targetField.name}. Public schedule updated.`,
      originalFieldName: originalField.name,
      newFieldName: targetField.name,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "The game could not be moved." };
  }
}
