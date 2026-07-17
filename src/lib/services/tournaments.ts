import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Tournament } from "@/lib/types";
import { getCurrentOrganizationScope, getWritableOrganizationId } from "../organization-scope";
import { assertActorUserId, requirePermission, safelyLogAudit } from "./identity";

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

const tournamentSelect = "id,organization_id,name,description,start_date,end_date,logo_url,website_url,created_at,updated_at";

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    organizationId: row.organization_id ?? null,
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
  const supabase = getSupabaseAdminClient();
  const organizationId = await getCurrentOrganizationScope();
  let query = supabase
    .from("tournaments")
    .select(tournamentSelect)
    .order("start_date", { ascending: false });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapTournament);
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const supabase = getSupabaseAdminClient();
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

export async function createTournament(data: CreateTournamentInput, actorUserId?: string | null): Promise<Tournament> {
  const supabase = getSupabaseAdminClient();
  const organizationId = await getWritableOrganizationId();
  const actor = assertActorUserId(actorUserId);
  if (!organizationId) {
    throw new Error("Organization scope is required to create a tournament.");
  }
  await requirePermission(actor, "tournament.manage", "organization", organizationId);

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .insert({
      organization_id: organizationId,
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

  const mappedTournament = mapTournament(tournament);
  await safelyLogAudit({
    action: "tournament.created",
    actorUserId: actor,
    metadata: { name: mappedTournament.name },
    resourceId: mappedTournament.id,
    resourceType: "tournament",
    scopeId: mappedTournament.organizationId ?? null,
    scopeType: "organization",
  });

  return mappedTournament;
}

export async function updateTournament(id: string, data: UpdateTournamentInput, actorUserId?: string | null): Promise<Tournament> {
  const actor = assertActorUserId(actorUserId);
  await requirePermission(actor, "tournament.manage", "tournament", id);

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

  const mappedTournament = mapTournament(tournament);
  await safelyLogAudit({
    action: "tournament.updated",
    actorUserId: actor,
    metadata: { name: mappedTournament.name },
    resourceId: mappedTournament.id,
    resourceType: "tournament",
    scopeId: mappedTournament.id,
    scopeType: "tournament",
  });

  return mappedTournament;
}
