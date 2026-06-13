import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { ExternalSource, ExternalSourceStatus, ExternalSourceType } from "@/lib/types";

type ExternalSourceRow = Database["public"]["Tables"]["external_sources"]["Row"];

export type CreateExternalSourceInput = {
  venue_id: string;
  source_type: ExternalSourceType;
  source_name: string;
  source_url?: string | null;
  source_status: ExternalSourceStatus;
  notes?: string | null;
};

export const externalSourceTypes: ExternalSourceType[] = ["sportsengine", "hometeamsonline", "teamsnap", "gamechanger", "csv", "ical", "other"];
export const externalSourceStatuses: ExternalSourceStatus[] = ["not_configured", "connected", "paused", "error", "unknown"];

const externalSourceSelect = "id,venue_id,source_type,source_name,source_url,source_status,last_sync_at,notes,created_at,updated_at";

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readSourceType(value: string): ExternalSourceType {
  return externalSourceTypes.find((type) => type === value) ?? "other";
}

function readSourceStatus(value: string): ExternalSourceStatus {
  if (value === "active") return "connected";
  if (value === "draft") return "not_configured";
  return externalSourceStatuses.find((status) => status === value) ?? "unknown";
}

export function getExternalSourceTypeLabel(type: ExternalSourceType) {
  const labels: Record<ExternalSourceType, string> = {
    csv: "CSV",
    gamechanger: "GameChanger",
    hometeamsonline: "HomeTeamsOnline",
    ical: "iCal / Calendar URL",
    other: "Other",
    sportsengine: "SportsEngine",
    teamsnap: "TeamSnap",
  };

  return labels[type];
}

export function getExternalSourceStatusLabel(status: ExternalSourceStatus) {
  const labels: Record<ExternalSourceStatus, string> = {
    connected: "Connected",
    error: "Needs Attention",
    not_configured: "Not Configured",
    paused: "Paused",
    unknown: "Unknown",
  };

  return labels[status];
}

function mapExternalSource(row: ExternalSourceRow): ExternalSource {
  return {
    createdAt: row.created_at,
    id: row.id,
    lastSyncAt: row.last_sync_at,
    notes: readOptionalText(row.notes),
    sourceName: row.source_name,
    sourceStatus: readSourceStatus(row.source_status),
    sourceType: readSourceType(row.source_type),
    sourceUrl: readOptionalText(row.source_url),
    updatedAt: row.updated_at,
    venueId: row.venue_id,
  };
}

export async function getExternalSources(): Promise<ExternalSource[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("external_sources")
    .select(externalSourceSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapExternalSource);
}

export async function getExternalSource(id: string): Promise<ExternalSource | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("external_sources")
    .select(externalSourceSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapExternalSource(data) : null;
}

export async function createExternalSource(data: CreateExternalSourceInput): Promise<ExternalSource> {
  const supabase = getSupabaseAdminClient();
  const { data: externalSource, error } = await supabase
    .from("external_sources")
    .insert({
      notes: readOptionalText(data.notes),
      source_name: data.source_name,
      source_status: readSourceStatus(data.source_status),
      source_type: readSourceType(data.source_type),
      source_url: readOptionalText(data.source_url),
      venue_id: data.venue_id,
    })
    .select(externalSourceSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapExternalSource(externalSource);
}

export async function updateExternalSourceLastSync(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("external_sources")
    .update({
      last_sync_at: new Date().toISOString(),
      source_status: "connected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateExternalSourceStatus(id: string, status: ExternalSourceStatus): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("external_sources")
    .update({
      source_status: readSourceStatus(status),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function runExternalSourceTestSync(id: string): Promise<void> {
  await updateExternalSourceLastSync(id);
}
