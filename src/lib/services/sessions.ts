import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Session } from "@/lib/types";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

export type CreateSessionInput = {
  field_id: string;
  title: string;
  home_team: string;
  away_team: string;
  start_time: string;
  status: Session["status"];
};

function mapSession(row: SessionRow): Session {
  return {
    id: row.id,
    fieldId: row.field_id,
    title: row.title,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    startTime: row.start_time,
    status: row.status === "active" || row.status === "final" ? row.status : "scheduled",
  };
}

export async function getSessions(): Promise<Session[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("id,field_id,title,home_team,away_team,start_time,status,created_at,updated_at")
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
    .select("id,field_id,title,home_team,away_team,start_time,status,created_at,updated_at")
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
    .select("id,field_id,title,home_team,away_team,start_time,status,created_at,updated_at")
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
    })
    .select("id,field_id,title,home_team,away_team,start_time,status,created_at,updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSession(session);
}
