import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { InningHalf, Session, SessionLinkLabel, SessionSportType } from "@/lib/types";
import { getCurrentOrganizationScope, getWritableOrganizationId } from "../organization-scope";
import { assertActorUserId, requirePermission, safelyLogAudit } from "./identity";
import { safelyCreateNotification } from "./notifications";
import { notifyScheduleChange } from "./schedule-notifications";
import { recordSessionEvent } from "./session-events";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SessionUpdateRow = Database["public"]["Tables"]["sessions"]["Update"];

const sessionSelect =
  "id,organization_id,field_id,play_surface_id,tournament_id,title,sport_type,home_team,away_team,start_time,end_time,status,home_score,away_score,is_demo,inning,inning_half,balls,strikes,outs,game_status,primary_link_label,primary_link_url,secondary_link_label,secondary_link_url,external_source,external_source_id,external_source_url,notes,created_at,updated_at";
const sessionSelectWithoutDemo =
  "id,organization_id,field_id,play_surface_id,tournament_id,title,sport_type,home_team,away_team,start_time,end_time,status,home_score,away_score,inning,inning_half,balls,strikes,outs,game_status,primary_link_label,primary_link_url,secondary_link_label,secondary_link_url,external_source,external_source_id,external_source_url,notes,created_at,updated_at";

const validLinkLabels = ["GameChanger", "SidelineHD", "YouTube", "SportsEngine", "TeamSnap", "Other"] as const;
const validSportTypes = ["baseball", "softball", "soccer", "football", "lacrosse", "basketball", "volleyball", "other"] as const;

export type CreateSessionInput = {
  field_id: string;
  play_surface_id?: string | null;
  tournament_id?: string | null;
  title: string;
  sport_type?: SessionSportType | "" | null;
  home_team: string;
  away_team: string;
  start_time: string;
  end_time?: string | null;
  is_demo?: boolean;
  status: Session["status"];
  primary_link_label?: SessionLinkLabel | "" | null;
  primary_link_url?: string | null;
  secondary_link_label?: SessionLinkLabel | "" | null;
  secondary_link_url?: string | null;
  external_source?: string | null;
  gdt_team_season_id?: string | null;
  gdt_home_team_season_id?: string | null;
  gdt_away_team_season_id?: string | null;
  external_source_id?: string | null;
  external_source_url?: string | null;
  notes?: string | null;
};

export type UpdateSessionInput = CreateSessionInput;

export type UpdateSessionGameStateInput = {
  home_score: number;
  away_score: number;
  inning: number;
  inning_half: InningHalf;
  balls: number;
  strikes: number;
  outs: number;
  game_status: Session["gameStatus"];
  primary_link_label?: SessionLinkLabel | "" | null;
  primary_link_url?: string | null;
  secondary_link_label?: SessionLinkLabel | "" | null;
  secondary_link_url?: string | null;
  notes?: string | null;
};

export type BulkUpdateSessionsInput = {
  sessionIds: string[];
  status?: Session["status"] | null;
  field_id?: string | null;
  shift_minutes?: number | null;
  notes?: string | null;
};

export type DuplicateSessionsInput = {
  sessionIds: string[];
  target_date: string;
};

function readSessionStatus(value: string): Session["status"] {
  return value === "active" || value === "final" ? value : "scheduled";
}

function readInningHalf(value: string): InningHalf {
  return value === "bottom" ? "bottom" : "top";
}

function readNumber(value: number | null | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readLinkLabel(value: string | null | undefined): SessionLinkLabel | null {
  return validLinkLabels.find((label) => label === value) ?? null;
}

function readSportType(value: string | null | undefined): SessionSportType {
  return validSportTypes.find((sportType) => sportType === value) ?? "baseball";
}

function isMissingIsDemoColumnError(error: { message?: string }) {
  return error.message?.includes("sessions.is_demo") === true
    || error.message?.includes("column sessions.is_demo does not exist") === true;
}

async function recordAutomaticStatusEvents(previousStatus: Session["status"] | null, nextSession: Session) {
  if (previousStatus !== "active" && nextSession.gameStatus === "active") {
    await recordSessionEvent({
      eventMessage: `${nextSession.title} started.`,
      eventType: "game_started",
      sessionId: nextSession.id,
    });
    await safelyCreateNotification({
      field_id: nextSession.fieldId,
      message: `${nextSession.title} is now live.`,
      notification_type: "session_status",
      session_id: nextSession.id,
      title: "Session started",
      venue_id: await getVenueIdForField(nextSession.fieldId),
    });
  }

  if (previousStatus !== "final" && nextSession.gameStatus === "final") {
    await recordSessionEvent({
      eventMessage: `${nextSession.title} marked final.`,
      eventType: "game_final",
      sessionId: nextSession.id,
    });
    await safelyCreateNotification({
      field_id: nextSession.fieldId,
      message: `${nextSession.title} was marked final.`,
      notification_type: "session_status",
      session_id: nextSession.id,
      title: "Session finalized",
      venue_id: await getVenueIdForField(nextSession.fieldId),
    });
  }
}

async function getVenueIdForField(fieldId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("fields")
    .select("venue_id")
    .eq("id", fieldId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load field venue for session notification", error);
    return null;
  }

  return data?.venue_id ?? null;
}

async function getOrganizationIdForField(fieldId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("fields")
    .select("organization_id")
    .eq("id", fieldId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load field organization for session", error);
  }

  return data?.organization_id ?? await getWritableOrganizationId();
}

function mapSession(row: Omit<SessionRow, "is_demo" | "scorekeeper_token" | "scorekeeper_pin" | "scorekeeper_seq" | "gdt_team_season_id" | "gdt_home_team_season_id" | "gdt_away_team_season_id"> & { is_demo?: boolean | null; scorekeeper_token?: string | null; scorekeeper_pin?: string | null; scorekeeper_seq?: number; gdt_team_season_id?: string | null; gdt_home_team_season_id?: string | null; gdt_away_team_season_id?: string | null }): Session {
  return {
    id: row.id,
    organizationId: row.organization_id ?? null,
    fieldId: row.field_id,
    playSurfaceId: readOptionalText(row.play_surface_id),
    tournamentId: readOptionalText(row.tournament_id),
    title: row.title,
    sportType: readSportType(row.sport_type),
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    startTime: row.start_time,
    endTime: readOptionalText(row.end_time),
    status: readSessionStatus(row.status),
    homeScore: readNumber(row.home_score, 0),
    awayScore: readNumber(row.away_score, 0),
    isDemo: Boolean(row.is_demo),
    inning: readNumber(row.inning, 1),
    inningHalf: readInningHalf(row.inning_half),
    balls: readNumber(row.balls, 0),
    strikes: readNumber(row.strikes, 0),
    outs: readNumber(row.outs, 0),
    gameStatus: readSessionStatus(row.game_status),
    primaryLinkLabel: readLinkLabel(row.primary_link_label),
    primaryLinkUrl: readOptionalText(row.primary_link_url),
    secondaryLinkLabel: readLinkLabel(row.secondary_link_label),
    secondaryLinkUrl: readOptionalText(row.secondary_link_url),
    externalSource: readOptionalText(row.external_source),
    externalSourceId: readOptionalText(row.external_source_id),
    externalSourceUrl: readOptionalText(row.external_source_url),
    notes: readOptionalText(row.notes),
    updatedAt: row.updated_at,
  };
}

export async function getSessions(): Promise<Session[]> {
  const supabase = getSupabaseServerClient();
  const organizationId = await getCurrentOrganizationScope();
  let query = supabase
    .from("sessions")
    .select(sessionSelect)
    .order("start_time", { ascending: true });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingIsDemoColumnError(error)) {
      let fallbackQuery = supabase
        .from("sessions")
        .select(sessionSelectWithoutDemo)
        .order("start_time", { ascending: true });

      if (organizationId) {
        fallbackQuery = fallbackQuery.eq("organization_id", organizationId);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;

      if (fallbackError) {
        throw new Error(fallbackError.message);
      }

      return (fallbackData ?? []).map(mapSession);
    }

    throw new Error(error.message);
  }

  return (data ?? []).map(mapSession);
}

export async function getSession(id: string): Promise<Session | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(sessionSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingIsDemoColumnError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("sessions")
        .select(sessionSelectWithoutDemo)
        .eq("id", id)
        .maybeSingle();

      if (fallbackError) {
        throw new Error(fallbackError.message);
      }

      return fallbackData ? mapSession(fallbackData) : null;
    }

    throw new Error(error.message);
  }

  return data ? mapSession(data) : null;
}

export async function getSessionsByFieldId(fieldId: string): Promise<Session[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(sessionSelect)
    .eq("field_id", fieldId)
    .order("start_time", { ascending: true });

  if (error) {
    if (isMissingIsDemoColumnError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("sessions")
        .select(sessionSelectWithoutDemo)
        .eq("field_id", fieldId)
        .order("start_time", { ascending: true });

      if (fallbackError) {
        throw new Error(fallbackError.message);
      }

      return (fallbackData ?? []).map(mapSession);
    }

    throw new Error(error.message);
  }

  return (data ?? []).map(mapSession);
}

export async function createSession(data: CreateSessionInput): Promise<Session> {
  const supabase = getSupabaseServerClient();
  const organizationId = await getOrganizationIdForField(data.field_id);
  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      organization_id: organizationId,
      field_id: data.field_id,
      play_surface_id: readOptionalText(data.play_surface_id),
      tournament_id: readOptionalText(data.tournament_id),
      title: data.title,
      sport_type: readSportType(data.sport_type),
      home_team: data.home_team,
      away_team: data.away_team,
      start_time: data.start_time,
      end_time: readOptionalText(data.end_time),
      is_demo: Boolean(data.is_demo),
      status: data.status,
      game_status: data.status,
      primary_link_label: readLinkLabel(data.primary_link_label),
      primary_link_url: readOptionalText(data.primary_link_url),
      secondary_link_label: readLinkLabel(data.secondary_link_label),
      secondary_link_url: readOptionalText(data.secondary_link_url),
      external_source: readOptionalText(data.external_source),
      gdt_team_season_id: readOptionalText(data.gdt_team_season_id),
      gdt_home_team_season_id: readOptionalText(data.gdt_home_team_season_id),
      gdt_away_team_season_id: readOptionalText(data.gdt_away_team_season_id),
      external_source_id: readOptionalText(data.external_source_id),
      external_source_url: readOptionalText(data.external_source_url),
      notes: readOptionalText(data.notes),
    })
    .select(sessionSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const mappedSession = mapSession(session);
  await recordSessionEvent({
    eventMessage: `${mappedSession.title} was created.`,
    eventType: "session_created",
    sessionId: mappedSession.id,
  });
  await recordAutomaticStatusEvents(null, mappedSession);

  return mappedSession;
}

export async function updateSession(id: string, data: UpdateSessionInput): Promise<Session> {
  const supabase = getSupabaseAdminClient();
  const previousSession = await getSession(id);
  const organizationId = await getOrganizationIdForField(data.field_id);
  const { data: session, error } = await supabase
    .from("sessions")
    .update({
      organization_id: organizationId,
      field_id: data.field_id,
      play_surface_id: readOptionalText(data.play_surface_id),
      tournament_id: readOptionalText(data.tournament_id),
      title: data.title,
      sport_type: readSportType(data.sport_type),
      home_team: data.home_team,
      away_team: data.away_team,
      start_time: data.start_time,
      end_time: readOptionalText(data.end_time),
      is_demo: Boolean(data.is_demo),
      status: data.status,
      game_status: data.status,
      primary_link_label: readLinkLabel(data.primary_link_label),
      primary_link_url: readOptionalText(data.primary_link_url),
      secondary_link_label: readLinkLabel(data.secondary_link_label),
      secondary_link_url: readOptionalText(data.secondary_link_url),
      external_source: readOptionalText(data.external_source),
      external_source_id: readOptionalText(data.external_source_id),
      external_source_url: readOptionalText(data.external_source_url),
      notes: readOptionalText(data.notes),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(sessionSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const mappedSession = mapSession(session);
  if (previousSession && (previousSession.homeScore !== mappedSession.homeScore || previousSession.awayScore !== mappedSession.awayScore)) {
    await recordSessionEvent({
      eventMessage: `Score updated: ${mappedSession.homeTeam} ${mappedSession.homeScore}, ${mappedSession.awayTeam} ${mappedSession.awayScore}.`,
      eventType: "score_update",
      sessionId: mappedSession.id,
    });
  }
  await recordAutomaticStatusEvents(previousSession?.gameStatus ?? null, mappedSession);
  if (previousSession && (previousSession.startTime !== mappedSession.startTime || previousSession.fieldId !== mappedSession.fieldId)) {
    // Awaited but best-effort internally: families and followers hear about
    // reschedules/moves; failures never block the schedule edit.
    await notifyScheduleChange({
      sessionId: mappedSession.id,
      title: mappedSession.title,
      homeTeam: mappedSession.homeTeam,
      awayTeam: mappedSession.awayTeam,
      fieldId: mappedSession.fieldId,
      startTime: mappedSession.startTime,
      previousStartTime: previousSession.startTime,
      previousFieldId: previousSession.fieldId,
    });
  }

  return mappedSession;
}

export async function updateSessionGameState(id: string, data: UpdateSessionGameStateInput, actorUserId?: string | null): Promise<Session> {
  const actor = assertActorUserId(actorUserId);
  await requirePermission(actor, "game.score.update", "session", id);

  const supabase = getSupabaseAdminClient();
  const previousSession = await getSession(id);
  const { data: session, error } = await supabase
    .from("sessions")
    .update({
      home_score: data.home_score,
      away_score: data.away_score,
      inning: data.inning,
      inning_half: data.inning_half,
      balls: data.balls,
      strikes: data.strikes,
      outs: data.outs,
      game_status: data.game_status,
      status: data.game_status,
      primary_link_label: readLinkLabel(data.primary_link_label),
      primary_link_url: readOptionalText(data.primary_link_url),
      secondary_link_label: readLinkLabel(data.secondary_link_label),
      secondary_link_url: readOptionalText(data.secondary_link_url),
      notes: readOptionalText(data.notes),
    })
    .eq("id", id)
    .select(sessionSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const mappedSession = mapSession(session);
  if (previousSession && (previousSession.homeScore !== mappedSession.homeScore || previousSession.awayScore !== mappedSession.awayScore)) {
    await recordSessionEvent({
      eventMessage: `Score updated: ${mappedSession.homeTeam} ${mappedSession.homeScore}, ${mappedSession.awayTeam} ${mappedSession.awayScore}.`,
      eventType: "score_update",
      sessionId: mappedSession.id,
    });
  }
  await recordAutomaticStatusEvents(previousSession?.gameStatus ?? null, mappedSession);
  await safelyLogAudit({
    action: "session.game_state.updated",
    actorUserId: actor,
    metadata: {
      away_score: mappedSession.awayScore,
      game_status: mappedSession.gameStatus,
      home_score: mappedSession.homeScore,
    },
    resourceId: mappedSession.id,
    resourceType: "session",
    scopeId: mappedSession.id,
    scopeType: "session",
  });

  return mappedSession;
}

export async function bulkUpdateSessions(data: BulkUpdateSessionsInput): Promise<number> {
  const sessionIds = [...new Set(data.sessionIds.filter(Boolean))];

  if (sessionIds.length === 0) {
    return 0;
  }

  const supabase = getSupabaseAdminClient();
  const updates: SessionUpdateRow = {
    updated_at: new Date().toISOString(),
  };

  if (data.status) {
    updates.status = data.status;
    updates.game_status = data.status;
  }

  if (data.field_id) {
    updates.field_id = data.field_id;
  }

  if ((data.shift_minutes && data.shift_minutes !== 0) || typeof data.notes === "string") {
    const { data: sessions, error: readError } = await supabase
      .from("sessions")
      .select(sessionSelect)
      .in("id", sessionIds);

    if (readError) {
      throw new Error(readError.message);
    }

    await Promise.all((sessions ?? []).map(async (session) => {
      const startTime = new Date(session.start_time);
      startTime.setMinutes(startTime.getMinutes() + (data.shift_minutes ?? 0));
      const endTime = session.end_time ? new Date(session.end_time) : null;
      if (endTime) {
        endTime.setMinutes(endTime.getMinutes() + (data.shift_minutes ?? 0));
      }
      const existingNotes = readOptionalText(session.notes);
      const addedNotes = readOptionalText(data.notes);

      const { error } = await supabase
        .from("sessions")
        .update({
          ...updates,
          start_time: startTime.toISOString(),
          end_time: endTime ? endTime.toISOString() : null,
          ...(typeof data.notes === "string" ? { notes: [existingNotes, addedNotes].filter(Boolean).join("\n") || null } : {}),
        })
        .eq("id", session.id);

      if (error) {
        throw new Error(error.message);
      }
    }));

    return sessions?.length ?? 0;
  }

  const { data: updatedSessions, error } = await supabase
    .from("sessions")
    .update(updates)
    .in("id", sessionIds)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return updatedSessions?.length ?? 0;
}

export async function duplicateSessionsToDate(data: DuplicateSessionsInput): Promise<number> {
  const sessionIds = [...new Set(data.sessionIds.filter(Boolean))];

  if (sessionIds.length === 0) {
    return 0;
  }

  const targetDate = new Date(`${data.target_date}T00:00:00`);

  if (Number.isNaN(targetDate.getTime())) {
    throw new Error("Choose a valid target date.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: sourceSessions, error: readError } = await supabase
    .from("sessions")
    .select(sessionSelect)
    .in("id", sessionIds);

  if (readError) {
    throw new Error(readError.message);
  }

  const inserts = (sourceSessions ?? []).map((session) => {
    const sourceStart = new Date(session.start_time);
    const startTime = new Date(targetDate);
    startTime.setHours(sourceStart.getHours(), sourceStart.getMinutes(), sourceStart.getSeconds(), sourceStart.getMilliseconds());

    let endTime: Date | null = null;
    if (session.end_time) {
      const sourceEnd = new Date(session.end_time);
      endTime = new Date(targetDate);
      endTime.setHours(sourceEnd.getHours(), sourceEnd.getMinutes(), sourceEnd.getSeconds(), sourceEnd.getMilliseconds());
    }

    return {
      field_id: session.field_id,
      play_surface_id: session.play_surface_id,
      tournament_id: session.tournament_id,
      title: session.title,
      sport_type: readSportType(session.sport_type),
      home_team: session.home_team,
      away_team: session.away_team,
      start_time: startTime.toISOString(),
      end_time: endTime ? endTime.toISOString() : null,
      status: "scheduled",
      game_status: "scheduled",
      home_score: 0,
      away_score: 0,
      inning: 1,
      inning_half: "top",
      balls: 0,
      strikes: 0,
      outs: 0,
      primary_link_label: session.primary_link_label,
      primary_link_url: session.primary_link_url,
      secondary_link_label: session.secondary_link_label,
      secondary_link_url: session.secondary_link_url,
      external_source: session.external_source,
      external_source_id: session.external_source_id ? `${session.external_source_id}:copy:${data.target_date}` : null,
      external_source_url: session.external_source_url,
      notes: session.notes,
    };
  });

  if (inserts.length === 0) {
    return 0;
  }

  const { data: duplicatedSessions, error } = await supabase
    .from("sessions")
    .insert(inserts)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return duplicatedSessions?.length ?? 0;
}

export async function deleteSessions(sessionIds: string[]): Promise<number> {
  const uniqueSessionIds = [...new Set(sessionIds.filter(Boolean))];

  if (uniqueSessionIds.length === 0) {
    return 0;
  }

  const supabase = getSupabaseAdminClient();
  const { data: deletedSessions, error } = await supabase
    .from("sessions")
    .delete()
    .in("id", uniqueSessionIds)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return deletedSessions?.length ?? 0;
}
