import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { InningHalf, Session, SessionLinkLabel } from "@/lib/types";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

const sessionSelect =
  "id,field_id,title,home_team,away_team,start_time,status,home_score,away_score,inning,inning_half,balls,strikes,outs,game_status,primary_link_label,primary_link_url,secondary_link_label,secondary_link_url,notes,created_at,updated_at";

const validLinkLabels = ["GameChanger", "SidelineHD", "YouTube", "SportsEngine", "TeamSnap", "Other"] as const;

export type CreateSessionInput = {
  field_id: string;
  title: string;
  home_team: string;
  away_team: string;
  start_time: string;
  status: Session["status"];
  primary_link_label?: SessionLinkLabel | "" | null;
  primary_link_url?: string | null;
  secondary_link_label?: SessionLinkLabel | "" | null;
  secondary_link_url?: string | null;
  notes?: string | null;
};

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

function mapSession(row: SessionRow): Session {
  return {
    id: row.id,
    fieldId: row.field_id,
    title: row.title,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    startTime: row.start_time,
    status: readSessionStatus(row.status),
    homeScore: readNumber(row.home_score, 0),
    awayScore: readNumber(row.away_score, 0),
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
    notes: readOptionalText(row.notes),
  };
}

export async function getSessions(): Promise<Session[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(sessionSelect)
    .order("start_time", { ascending: true });

  if (error) {
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
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSession);
}

export async function createSession(data: CreateSessionInput): Promise<Session> {
  const supabase = getSupabaseServerClient();
  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      field_id: data.field_id,
      title: data.title,
      home_team: data.home_team,
      away_team: data.away_team,
      start_time: data.start_time,
      status: data.status,
      game_status: data.status,
      primary_link_label: readLinkLabel(data.primary_link_label),
      primary_link_url: readOptionalText(data.primary_link_url),
      secondary_link_label: readLinkLabel(data.secondary_link_label),
      secondary_link_url: readOptionalText(data.secondary_link_url),
      notes: readOptionalText(data.notes),
    })
    .select(sessionSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSession(session);
}

export async function updateSessionGameState(id: string, data: UpdateSessionGameStateInput): Promise<Session> {
  const supabase = getSupabaseAdminClient();
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

  return mapSession(session);
}
