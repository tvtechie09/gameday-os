import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Tournament } from "@/lib/types";

type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];

export type CreateTournamentInput = {
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  logo_url?: string | null;
  website_url?: string | null;
};

export type UpdateTournamentInput = CreateTournamentInput;

const tournamentSelect = "id,name,description,start_date,end_date,logo_url,website_url,created_at,updated_at";

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    startDate: row.start_date,
    endDate: row.end_date,
    logoUrl: readOptionalText(row.logo_url),
    websiteUrl: readOptionalText(row.website_url),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTournaments(): Promise<Tournament[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select(tournamentSelect)
    .order("start_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapTournament);
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select(tournamentSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapTournament(data) : null;
}

export async function createTournament(data: CreateTournamentInput): Promise<Tournament> {
  const supabase = getSupabaseAdminClient();
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .insert({
      name: data.name,
      description: readOptionalText(data.description),
      start_date: data.start_date,
      end_date: data.end_date,
      logo_url: readOptionalText(data.logo_url),
      website_url: readOptionalText(data.website_url),
    })
    .select(tournamentSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapTournament(tournament);
}

export async function updateTournament(id: string, data: UpdateTournamentInput): Promise<Tournament> {
  const supabase = getSupabaseAdminClient();
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .update({
      name: data.name,
      description: readOptionalText(data.description),
      start_date: data.start_date,
      end_date: data.end_date,
      logo_url: readOptionalText(data.logo_url),
      website_url: readOptionalText(data.website_url),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(tournamentSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapTournament(tournament);
}
