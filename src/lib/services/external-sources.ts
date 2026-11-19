import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { ExternalSource, ExternalSourceStatus, ExternalSourceType } from "@/lib/types";
import { getCurrentOrganizationScope } from "../organization-scope";
import { assertActorUserId, PermissionDeniedError, requirePermission, safelyLogAudit } from "./identity";

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

const externalSourceSelect = "id,organization_id,venue_id,source_type,source_name,source_url,source_status,last_sync_at,notes,created_at,updated_at";

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
    organizationId: row.organization_id ?? null,
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
  const supabase = getSupabaseAdminClient();
  const organizationId = await getCurrentOrganizationScope();
  let query = supabase
    .from("external_sources")
    .select(externalSourceSelect)
    .order("created_at", { ascending: false });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapExternalSource);
}

export async function getExternalSource(id: string): Promise<ExternalSource | null> {
  const supabase = getSupabaseAdminClient();
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

export async function getAuthorizedExternalSource(id: string, actorUserId: string, permissionKey: string): Promise<ExternalSource> {
  const actor = assertActorUserId(actorUserId);
  const sourceId = id.trim();
  if (!sourceId) throw new PermissionDeniedError("External source is required.");
  const source = await getExternalSource(sourceId);
  if (!source) throw new PermissionDeniedError("External source is not available in this scope.");
  await requirePermission(actor, permissionKey, "venue", source.venueId);
  return source;
}

export async function createExternalSource(data: CreateExternalSourceInput, actorUserId: string): Promise<ExternalSource> {
  const actor = assertActorUserId(actorUserId);
  const supabase = getSupabaseAdminClient();
  const { data: venue, error: venueError } = await supabase.from("venues").select("id,organization_id").eq("id", data.venue_id.trim()).maybeSingle();
  if (venueError) throw new Error(venueError.message);
  if (!venue) throw new PermissionDeniedError("External source venue is not available in this scope.");
  await requirePermission(actor, "integrations.create", "venue", venue.id);
  const { data: externalSource, error } = await supabase
    .from("external_sources")
    .insert({
      organization_id: venue.organization_id,
      notes: readOptionalText(data.notes),
      source_name: data.source_name,
      source_status: readSourceStatus(data.source_status),
      source_type: readSourceType(data.source_type),
      source_url: readOptionalText(data.source_url),
      venue_id: venue.id,
    })
    .select(externalSourceSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const source = mapExternalSource(externalSource);
  await safelyLogAudit({ action: "integration.external_source_create", actorUserId: actor, metadata: { sourceType: source.sourceType }, resourceId: source.id, resourceType: "external_source", scopeId: source.venueId, scopeType: "venue" });
  return source;
}

export async function updateExternalSourceLastSync(id: string, actorUserId: string): Promise<void> {
  const actor = assertActorUserId(actorUserId);
  const source = await getAuthorizedExternalSource(id, actor, "integrations.sync");
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("external_sources")
    .update({
      last_sync_at: new Date().toISOString(),
      source_status: "connected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", source.id)
    .eq("venue_id", source.venueId);

  if (error) {
    throw new Error(error.message);
  }
  await safelyLogAudit({ action: "integration.external_source_sync", actorUserId: actor, resourceId: source.id, resourceType: "external_source", scopeId: source.venueId, scopeType: "venue" });
}

export async function updateExternalSourceStatus(id: string, status: ExternalSourceStatus, actorUserId: string): Promise<void> {
  const actor = assertActorUserId(actorUserId);
  const source = await getAuthorizedExternalSource(id, actor, "integrations.edit");
  const normalizedStatus = readSourceStatus(status);
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("external_sources")
    .update({
      source_status: normalizedStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", source.id)
    .eq("venue_id", source.venueId);

  if (error) {
    throw new Error(error.message);
  }
  await safelyLogAudit({ action: "integration.external_source_status_update", actorUserId: actor, metadata: { status: normalizedStatus }, resourceId: source.id, resourceType: "external_source", scopeId: source.venueId, scopeType: "venue" });
}

export async function runExternalSourceTestSync(id: string, actorUserId: string): Promise<void> {
  await updateExternalSourceLastSync(id, actorUserId);
}
