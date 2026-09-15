import { requirePermission, safelyLogAudit } from "@/lib/services/identity";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { notifyScheduleChange } from "@/lib/services/schedule-notifications";
import { recordSessionEvent } from "@/lib/services/session-events";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Session } from "@/lib/types";
import {
  findScheduleConflicts,
  planDelay,
  planDelayRemaining,
  planFieldSwap,
  planLifecycleChange,
  planSingleGameMove,
  type ScheduleChange,
} from "./schedule-operations-core";

export type RapidScheduleOperation =
  | { type: "delay_game"; sessionId: string; minutes: number }
  | { type: "delay_remaining"; fieldId: string; fromTime: string; minutes: number }
  | { type: "move_game"; sessionId: string; fieldId: string; startTime?: string }
  | { type: "swap_fields"; firstSessionId: string; secondSessionId: string }
  | { type: "cancel" | "postpone"; sessionId: string };

type ScheduleRpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: number | null; error: { message: string } | null }>;
};

function sessionById(sessions: Session[], id: string) {
  const session = sessions.find((candidate) => candidate.id === id);
  if (!session) throw new Error("Game not found.");
  return session;
}

function buildChanges(sessions: Session[], operation: RapidScheduleOperation): ScheduleChange[] {
  if (operation.type === "delay_game") return [planDelay(sessionById(sessions, operation.sessionId), operation.minutes)];
  if (operation.type === "delay_remaining") return planDelayRemaining(sessions, operation.fieldId, operation.fromTime, operation.minutes);
  if (operation.type === "move_game") return [planSingleGameMove(sessionById(sessions, operation.sessionId), { fieldId: operation.fieldId, startTime: operation.startTime, reason: "Game moved" })];
  if (operation.type === "swap_fields") return planFieldSwap(sessionById(sessions, operation.firstSessionId), sessionById(sessions, operation.secondSessionId));
  return [planLifecycleChange(sessionById(sessions, operation.sessionId), operation.type === "cancel" ? "cancelled" : "postponed")];
}

export async function executeRapidScheduleOperation(operation: RapidScheduleOperation, actorUserId: string): Promise<{ count: number; venueId: string }> {
  const [sessions, fields] = await Promise.all([getSessions(), getFields()]);
  const changes = buildChanges(sessions, operation);
  if (changes.length === 0) throw new Error("No upcoming games matched this operation.");
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  const venueIds = new Set(changes.map((change) => fieldById.get(change.fieldId)?.venueId).filter((id): id is string => Boolean(id)));
  for (const change of changes) {
    const original = sessionById(sessions, change.sessionId);
    const originalVenueId = fieldById.get(original.fieldId)?.venueId;
    if (originalVenueId) venueIds.add(originalVenueId);
  }
  if (venueIds.size !== 1) throw new Error("Schedule operations cannot cross venue boundaries.");
  const venueId = [...venueIds][0];
  await requirePermission(actorUserId, "venue.field.manage", "venue", venueId);

  const conflicts = findScheduleConflicts(sessions, changes);
  if (conflicts.length > 0) throw new Error(`Schedule conflict: ${conflicts[0].message}`);

  const operationId = crypto.randomUUID();
  const client = getSupabaseAdminClient() as unknown as ScheduleRpcClient;
  const { data, error } = await client.rpc("apply_schedule_operation", {
    p_actor_user_id: actorUserId,
    p_changes: changes.map((change) => ({
      end_time: change.endTime,
      field_id: change.fieldId,
      lifecycle_status: change.lifecycleStatus,
      reason: change.reason,
      session_id: change.sessionId,
      start_time: change.startTime,
    })),
    p_operation_id: operationId,
    p_operation_type: operation.type,
    p_venue_id: venueId,
  });
  if (error) throw new Error(error.message);
  await Promise.all(changes.map(async (change) => {
    const previous = sessionById(sessions, change.sessionId);
    await Promise.all([
      recordSessionEvent({ sessionId: change.sessionId, eventType: "operations_update", eventMessage: change.reason }).catch(() => null),
      notifyScheduleChange({
        sessionId: change.sessionId,
        title: previous.title,
        homeTeam: previous.homeTeam,
        awayTeam: previous.awayTeam,
        fieldId: change.fieldId,
        startTime: change.startTime,
        previousFieldId: previous.fieldId,
        previousStartTime: previous.startTime,
      }),
    ]);
  }));
  await safelyLogAudit({
    action: `session.schedule.${operation.type}`,
    actorUserId,
    metadata: {
      count: data ?? changes.length,
      operation_id: operationId,
      changes: changes.map((change) => {
        const previous = sessionById(sessions, change.sessionId);
        return {
          session_id: change.sessionId,
          game: previous.title || `${previous.homeTeam} vs ${previous.awayTeam}`,
          original_field_id: previous.fieldId,
          original_field: fieldById.get(previous.fieldId)?.name ?? previous.fieldId,
          new_field_id: change.fieldId,
          new_field: fieldById.get(change.fieldId)?.name ?? change.fieldId,
          original_start_time: previous.startTime,
          new_start_time: change.startTime,
        };
      }),
    },
    resourceId: venueId,
    resourceType: "venue",
    scopeId: venueId,
    scopeType: "venue",
  });
  return { count: data ?? changes.length, venueId };
}
