import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { SessionEvent, SessionEventType } from "@/lib/types";
import { getOrganizationDataScope } from "./organization-data-scope";

type SessionEventRow = Database["public"]["Tables"]["session_events"]["Row"];

export type RecordSessionEventInput = {
  sessionId: string;
  eventType: SessionEventType;
  eventMessage: string;
};

export const sessionEventTypes: SessionEventType[] = [
  "session_created",
  "score_update",
  "resource_activated",
  "alert_created",
  "sponsor_clicked",
  "game_started",
  "game_final",
];

const sessionEventSelect = "id,session_id,event_type,event_message,created_at";

function readEventType(value: string): SessionEventType {
  return sessionEventTypes.find((type) => type === value) ?? "score_update";
}

function sanitizeMessage(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 500) : "Session event recorded.";
}

function mapSessionEvent(row: SessionEventRow): SessionEvent {
  return {
    createdAt: row.created_at,
    eventMessage: row.event_message,
    eventType: readEventType(row.event_type),
    id: row.id,
    sessionId: row.session_id,
  };
}

export function getSessionEventTypeLabel(type: SessionEventType) {
  const labels: Record<SessionEventType, string> = {
    alert_created: "Alert",
    game_final: "Final",
    game_started: "Started",
    resource_activated: "Resource",
    score_update: "Score",
    session_created: "Created",
    sponsor_clicked: "Sponsor",
  };

  return labels[type];
}

export async function recordSessionEvent(input: RecordSessionEventInput): Promise<SessionEvent> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("session_events")
    .insert({
      event_message: sanitizeMessage(input.eventMessage),
      event_type: readEventType(input.eventType),
      session_id: input.sessionId,
    })
    .select(sessionEventSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSessionEvent(data);
}

export async function getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("session_events")
    .select(sessionEventSelect)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSessionEvent);
}

export async function getRecentSessionEvents(limit = 12): Promise<SessionEvent[]> {
  const supabase = getSupabaseServerClient();
  const scope = await getOrganizationDataScope();
  let query = supabase
    .from("session_events")
    .select(sessionEventSelect)
    .order("created_at", { ascending: false });

  if (scope) {
    if (scope.sessionIds.size === 0) {
      return [];
    }

    query = query.in("session_id", [...scope.sessionIds]);
  }

  const { data, error } = await query.limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSessionEvent);
}
