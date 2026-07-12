import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameDayScheduleEvent } from "@/lib/sportsengine-integration";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type { Field } from "@/lib/types";
import { createIntegrationConnection, getIntegrationLogs, getIntegrationProviderStatus, runIntegrationSync } from "./integration-framework";
import { assertActorUserId, requirePermission, safelyLogAudit } from "./identity";

type MappingStatus = "pending" | "mapped" | "missing_field" | "duplicate" | "imported" | "error";
type FieldMappingStatus = "active" | "ignored" | "needs_review";

type FieldMappingRow = {
  id: string;
  connection_id: string;
  organization_id: string | null;
  venue_id: string | null;
  field_id: string | null;
  provider_key: string;
  external_venue_id: string | null;
  external_field_id: string;
  external_field_name: string;
  mapping_status: FieldMappingStatus;
  created_at: string;
  updated_at: string;
};

type EventMappingRow = {
  id: string;
  connection_id: string;
  organization_id: string | null;
  venue_id: string | null;
  field_id: string | null;
  session_id: string | null;
  provider_key: string;
  external_event_id: string;
  external_org_id: string | null;
  external_venue_id: string | null;
  external_field_id: string | null;
  normalized_event: Json;
  mapping_status: MappingStatus;
  admin_override: Json;
  has_admin_override: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

type SportsEngineTables = {
  integration_field_mappings: { Row: FieldMappingRow; Insert: Partial<FieldMappingRow>; Update: Partial<FieldMappingRow>; Relationships: [] };
  integration_event_mappings: { Row: EventMappingRow; Insert: Partial<EventMappingRow>; Update: Partial<EventMappingRow>; Relationships: [] };
};

type SportsEngineDatabase = { public: { Tables: SportsEngineTables; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };
type SportsEngineClient = SupabaseClient<SportsEngineDatabase>;

export type SportsEngineConnection = {
  id: string;
  organizationId: string | null;
  venueId: string | null;
  externalOrgId: string | null;
  connectionStatus: string;
  authStatus: string;
  sourceUrl: string | null;
  lastSyncAt: string | null;
  notes: string | null;
};

export type SportsEngineFieldMapping = {
  id: string;
  connectionId: string;
  venueId: string | null;
  fieldId: string | null;
  externalVenueId: string | null;
  externalFieldId: string;
  externalFieldName: string;
  mappingStatus: FieldMappingStatus;
};

export type SportsEngineEventMapping = {
  id: string;
  connectionId: string;
  fieldId: string | null;
  sessionId: string | null;
  externalEventId: string;
  externalFieldId: string | null;
  normalizedEvent: GameDayScheduleEvent | null;
  mappingStatus: MappingStatus;
  hasAdminOverride: boolean;
  lastSyncedAt: string | null;
};

export type SportsEngineSyncSummary = {
  runId: string;
  recordsFound: number;
  imported: number;
  skipped: number;
  missingFieldMappings: number;
  errors: string[];
};

export type SportsEngineDashboardSchedule = {
  todayByField: Array<{ field: Field; events: SportsEngineEventMapping[] }>;
  upcoming: SportsEngineEventMapping[];
  unmapped: SportsEngineEventMapping[];
};

const fieldMappingSelect = "id,connection_id,organization_id,venue_id,field_id,provider_key,external_venue_id,external_field_id,external_field_name,mapping_status,created_at,updated_at";
const eventMappingSelect = "id,connection_id,organization_id,venue_id,field_id,session_id,provider_key,external_event_id,external_org_id,external_venue_id,external_field_id,normalized_event,mapping_status,admin_override,has_admin_override,last_synced_at,created_at,updated_at";

function getClient() {
  return getSupabaseAdminClient() as unknown as SportsEngineClient;
}

function readNormalizedEvent(value: Json): GameDayScheduleEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return typeof record.external_event_id === "string" ? record as unknown as GameDayScheduleEvent : null;
}

function mapFieldMapping(row: FieldMappingRow): SportsEngineFieldMapping {
  return { connectionId: row.connection_id, externalFieldId: row.external_field_id, externalFieldName: row.external_field_name, externalVenueId: row.external_venue_id, fieldId: row.field_id, id: row.id, mappingStatus: row.mapping_status, venueId: row.venue_id };
}

function mapEventMapping(row: EventMappingRow): SportsEngineEventMapping {
  return { connectionId: row.connection_id, externalEventId: row.external_event_id, externalFieldId: row.external_field_id, fieldId: row.field_id, hasAdminOverride: row.has_admin_override, id: row.id, lastSyncedAt: row.last_synced_at, mappingStatus: row.mapping_status, normalizedEvent: readNormalizedEvent(row.normalized_event), sessionId: row.session_id };
}

function isSameDay(value: string, date: Date) {
  const parsed = new Date(value);
  return parsed.getFullYear() === date.getFullYear() && parsed.getMonth() === date.getMonth() && parsed.getDate() === date.getDate();
}

export async function getSportsEngineStatus(actorUserId: string) {
  const summary = await getIntegrationProviderStatus("sportsengine", actorUserId);
  return summary.connection ? [{
    authStatus: summary.connection.authStatus,
    connectionStatus: summary.connection.connectionStatus,
    externalOrgId: summary.connection.externalOrgId,
    id: summary.connection.id,
    lastSyncAt: summary.connection.lastSyncAt,
    notes: summary.connection.notes,
    organizationId: summary.connection.organizationId,
    sourceUrl: summary.connection.sourceUrl,
    venueId: summary.connection.venueId,
  }] : [];
}

export async function connectSportsEngine(input: { organizationId?: string | null; venueId: string; externalOrgId: string; sourceUrl?: string | null; notes?: string | null }, actorUserId: string) {
  const connection = await createIntegrationConnection({ externalOrgId: input.externalOrgId, notes: input.notes, organizationId: input.organizationId, providerKey: "sportsengine", sourceUrl: input.sourceUrl, venueId: input.venueId }, actorUserId);
  return {
    authStatus: connection.authStatus,
    connectionStatus: connection.connectionStatus,
    externalOrgId: connection.externalOrgId,
    id: connection.id,
    lastSyncAt: connection.lastSyncAt,
    notes: connection.notes,
    organizationId: connection.organizationId,
    sourceUrl: connection.sourceUrl,
    venueId: connection.venueId,
  } satisfies SportsEngineConnection;
}

export async function syncSportsEngineSchedule(connectionId: string, actorUserId: string): Promise<SportsEngineSyncSummary> {
  const run = await runIntegrationSync("sportsengine", actorUserId, `sportsengine:${connectionId}:${new Date().toISOString().slice(0, 16)}`);
  return { errors: run.error_message ? [run.error_message] : [], imported: run.records_imported, missingFieldMappings: run.records_missing_mapping, recordsFound: run.records_found, runId: run.id, skipped: run.records_skipped };
}

export async function getSportsEngineFieldMappings(connectionId: string, actorUserId: string) {
  await getIntegrationProviderStatus("sportsengine", actorUserId);
  const supabase = getClient();
  const { data, error } = await supabase.from("integration_field_mappings").select(fieldMappingSelect).eq("connection_id", connectionId).order("external_field_name", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as FieldMappingRow[]).map(mapFieldMapping);
}

export async function getSportsEngineEvents(connectionId: string, actorUserId: string) {
  await getIntegrationProviderStatus("sportsengine", actorUserId);
  const supabase = getClient();
  const { data, error } = await supabase.from("integration_event_mappings").select(eventMappingSelect).eq("connection_id", connectionId).order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as EventMappingRow[]).map(mapEventMapping);
}

export async function upsertSportsEngineFieldMapping(input: { connectionId: string; venueId?: string | null; organizationId?: string | null; fieldId: string; externalVenueId?: string | null; externalFieldId: string; externalFieldName: string }, actorUserId: string) {
  const actor = assertActorUserId(actorUserId);
  if (input.venueId) await requirePermission(actor, "integrations.edit", "venue", input.venueId);
  const supabase = getClient();
  const { data, error } = await supabase.from("integration_field_mappings").upsert({ connection_id: input.connectionId, external_field_id: input.externalFieldId, external_field_name: input.externalFieldName, external_venue_id: input.externalVenueId ?? null, field_id: input.fieldId, mapping_status: "active", organization_id: input.organizationId ?? null, provider_key: "sportsengine", updated_at: new Date().toISOString(), venue_id: input.venueId ?? null }, { onConflict: "connection_id,external_field_id" }).select(fieldMappingSelect).single();
  if (error) throw new Error(error.message);
  await safelyLogAudit({ action: "integration.mapping_update", actorUserId: actor, metadata: { externalFieldId: input.externalFieldId, providerKey: "sportsengine" }, resourceId: (data as unknown as FieldMappingRow).id, resourceType: "integration_field_mapping", scopeId: input.venueId ?? input.organizationId ?? null, scopeType: input.venueId ? "venue" : "organization" });
  return mapFieldMapping(data as unknown as FieldMappingRow);
}

export async function getSportsEngineDashboardSchedule(venueId: string) {
  const supabase = getClient();
  const { data, error } = await supabase.from("integration_event_mappings").select(eventMappingSelect).eq("venue_id", venueId).eq("provider_key", "sportsengine").order("updated_at", { ascending: false });
  if (error) return { todayByField: [], upcoming: [], unmapped: [] } satisfies SportsEngineDashboardSchedule;
  const mappings = ((data ?? []) as unknown as EventMappingRow[]).map(mapEventMapping);
  const today = new Date();
  const upcoming = mappings.filter((mapping) => mapping.normalizedEvent && new Date(mapping.normalizedEvent.start_time).getTime() >= Date.now()).slice(0, 8);
  const unmapped = mappings.filter((mapping) => mapping.mappingStatus === "missing_field").slice(0, 8);
  const fieldIds = [...new Set(mappings.map((mapping) => mapping.fieldId).filter(Boolean))] as string[];
  const { data: fieldRows } = fieldIds.length > 0 ? await getSupabaseAdminClient().from("fields").select("id,organization_id,venue_id,zone_id,parent_field_id,name,sport_type,surface_code,layout_role,map_label,map_x,map_y,field_status,created_at,updated_at").in("id", fieldIds) : { data: [] };
  const fields = (fieldRows ?? []).map((row) => ({ id: row.id, organizationId: row.organization_id, venueId: row.venue_id, zoneId: row.zone_id, parentFieldId: row.parent_field_id, name: row.name, sportType: row.sport_type, surfaceCode: row.surface_code, layoutRole: row.layout_role, mapLabel: row.map_label, mapX: row.map_x, mapY: row.map_y, status: row.field_status ?? "open", qrPath: `/fields/${row.id}`, resources: [], updatedAt: row.updated_at })) as Field[];
  const todayByField = fields.map((field) => ({ field, events: mappings.filter((mapping) => mapping.fieldId === field.id && mapping.normalizedEvent && isSameDay(mapping.normalizedEvent.start_time, today)) }));
  return { todayByField, upcoming, unmapped } satisfies SportsEngineDashboardSchedule;
}

export async function getSportsEngineSyncLogs(_connectionId: string, actorUserId: string) {
  return getIntegrationLogs("sportsengine", actorUserId);
}

export function protectManualOverride(existing: { hasAdminOverride: boolean; adminOverride?: Json | null }) {
  return existing.hasAdminOverride || (typeof existing.adminOverride === "object" && existing.adminOverride !== null && !Array.isArray(existing.adminOverride) && Object.keys(existing.adminOverride).length > 0);
}
