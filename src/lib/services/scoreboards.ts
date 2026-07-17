import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { ScoreboardConnectionType, ScoreboardIntegrationMode, ScoreboardProfile, ScoreboardStatus } from "@/lib/types";
import { getCurrentOrganizationScope, getWritableOrganizationId } from "../organization-scope";

type ScoreboardProfileRow = Database["public"]["Tables"]["scoreboard_profiles"]["Row"];

export type CreateScoreboardProfileInput = {
  venue_id: string;
  field_id: string;
  resource_id?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  connection_type: ScoreboardConnectionType;
  integration_mode: ScoreboardIntegrationMode;
  scoreboard_status: ScoreboardStatus;
  ip_address?: string | null;
  controller_location?: string | null;
  notes?: string | null;
};

export type UpdateScoreboardProfileInput = CreateScoreboardProfileInput;

export const scoreboardConnectionTypes: ScoreboardConnectionType[] = ["manual", "network", "serial", "controller_bridge", "cloud_api", "obs_overlay", "unknown"];
export const scoreboardIntegrationModes: ScoreboardIntegrationMode[] = ["manual_only", "read_only", "write_to_scoreboard", "write_to_overlay", "future_hardware"];
export const scoreboardStatuses: ScoreboardStatus[] = ["not_configured", "configured", "testing", "active", "offline"];

const scoreboardSelect = "id,organization_id,venue_id,field_id,resource_id,manufacturer,model,connection_type,integration_mode,scoreboard_status,ip_address,controller_location,notes,created_at,updated_at";

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readConnectionType(value: string): ScoreboardConnectionType {
  return scoreboardConnectionTypes.find((type) => type === value) ?? "unknown";
}

function readIntegrationMode(value: string): ScoreboardIntegrationMode {
  return scoreboardIntegrationModes.find((mode) => mode === value) ?? "manual_only";
}

function readScoreboardStatus(value: string): ScoreboardStatus {
  return scoreboardStatuses.find((status) => status === value) ?? "not_configured";
}

function isMissingScoreboardProfilesTableError(error: { code?: string; message?: string }) {
  return error.code === "PGRST205"
    || error.message?.includes("scoreboard_profiles") === true
    || error.message?.includes("schema cache") === true;
}

export function getScoreboardConnectionTypeLabel(type: ScoreboardConnectionType) {
  const labels: Record<ScoreboardConnectionType, string> = {
    manual: "Manual",
    network: "Network",
    serial: "Serial",
    controller_bridge: "Controller Bridge",
    cloud_api: "Cloud API",
    obs_overlay: "OBS Overlay",
    unknown: "Unknown",
  };

  return labels[type];
}

export function getScoreboardIntegrationModeLabel(mode: ScoreboardIntegrationMode) {
  const labels: Record<ScoreboardIntegrationMode, string> = {
    manual_only: "Manual Only",
    read_only: "Read Only",
    write_to_scoreboard: "Write to Scoreboard",
    write_to_overlay: "Write to Overlay",
    future_hardware: "Future Hardware",
  };

  return labels[mode];
}

export function getScoreboardStatusLabel(status: ScoreboardStatus) {
  const labels: Record<ScoreboardStatus, string> = {
    not_configured: "Not Configured",
    configured: "Configured",
    testing: "Testing",
    active: "Active",
    offline: "Offline",
  };

  return labels[status];
}

export function getScoreboardStatusClass(status: ScoreboardStatus) {
  if (status === "active") {
    return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  }

  if (status === "testing" || status === "configured") {
    return "bg-blue-50 text-blue-800";
  }

  if (status === "offline") {
    return "bg-red-100 text-red-900";
  }

  return "bg-slate-100 text-slate-700";
}

export function mapScoreboardProfile(row: ScoreboardProfileRow): ScoreboardProfile {
  return {
    id: row.id,
    organizationId: row.organization_id ?? null,
    venueId: row.venue_id,
    fieldId: row.field_id,
    resourceId: row.resource_id,
    manufacturer: row.manufacturer,
    model: row.model,
    connectionType: readConnectionType(row.connection_type),
    integrationMode: readIntegrationMode(row.integration_mode),
    scoreboardStatus: readScoreboardStatus(row.scoreboard_status),
    ipAddress: readOptionalText(row.ip_address),
    controllerLocation: readOptionalText(row.controller_location),
    notes: readOptionalText(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getScoreboardProfiles(): Promise<ScoreboardProfile[]> {
  const supabase = getSupabaseAdminClient();
  const organizationId = await getCurrentOrganizationScope();
  let query = supabase
    .from("scoreboard_profiles")
    .select(scoreboardSelect)
    .order("created_at", { ascending: false });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingScoreboardProfilesTableError(error)) {
      console.error("scoreboard_profiles table is unavailable; returning no scoreboard profiles.", error);
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []).map(mapScoreboardProfile);
}

export async function getScoreboardProfile(id: string): Promise<ScoreboardProfile | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("scoreboard_profiles")
    .select(scoreboardSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingScoreboardProfilesTableError(error)) {
      console.error("scoreboard_profiles table is unavailable; returning no scoreboard profile.", error);
      return null;
    }

    throw new Error(error.message);
  }

  return data ? mapScoreboardProfile(data) : null;
}

export async function getScoreboardProfileForField(fieldId: string): Promise<ScoreboardProfile | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("scoreboard_profiles")
    .select(scoreboardSelect)
    .eq("field_id", fieldId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingScoreboardProfilesTableError(error)) {
      console.error("scoreboard_profiles table is unavailable; returning no scoreboard profile for field.", error);
      return null;
    }

    throw new Error(error.message);
  }

  return data ? mapScoreboardProfile(data) : null;
}

export async function createScoreboardProfile(data: CreateScoreboardProfileInput): Promise<ScoreboardProfile> {
  const supabase = getSupabaseAdminClient();
  const organizationId = await getOrganizationIdForVenue(data.venue_id);
  const { data: profile, error } = await supabase
    .from("scoreboard_profiles")
    .insert({
      organization_id: organizationId,
      venue_id: data.venue_id,
      field_id: data.field_id,
      resource_id: readOptionalText(data.resource_id),
      manufacturer: readOptionalText(data.manufacturer) ?? "Manual",
      model: readOptionalText(data.model) ?? "GameDay OS",
      connection_type: data.connection_type,
      integration_mode: data.integration_mode,
      scoreboard_status: data.scoreboard_status,
      ip_address: readOptionalText(data.ip_address),
      controller_location: readOptionalText(data.controller_location),
      notes: readOptionalText(data.notes),
    })
    .select(scoreboardSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapScoreboardProfile(profile);
}

export async function updateScoreboardProfile(id: string, data: UpdateScoreboardProfileInput): Promise<ScoreboardProfile> {
  const supabase = getSupabaseAdminClient();
  const organizationId = await getOrganizationIdForVenue(data.venue_id);
  const { data: profile, error } = await supabase
    .from("scoreboard_profiles")
    .update({
      organization_id: organizationId,
      venue_id: data.venue_id,
      field_id: data.field_id,
      resource_id: readOptionalText(data.resource_id),
      manufacturer: readOptionalText(data.manufacturer) ?? "Manual",
      model: readOptionalText(data.model) ?? "GameDay OS",
      connection_type: data.connection_type,
      integration_mode: data.integration_mode,
      scoreboard_status: data.scoreboard_status,
      ip_address: readOptionalText(data.ip_address),
      controller_location: readOptionalText(data.controller_location),
      notes: readOptionalText(data.notes),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(scoreboardSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapScoreboardProfile(profile);
}

async function getOrganizationIdForVenue(venueId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("venues")
    .select("organization_id")
    .eq("id", venueId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load venue organization for scoreboard profile", error);
  }

  return data?.organization_id ?? await getWritableOrganizationId();
}
