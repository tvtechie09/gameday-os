import type { SupabaseClient } from "@supabase/supabase-js";
import { platformScopeSentinel } from "@/lib/access/demo-users";
import { integrationHealth, type IntegrationHealth } from "@/lib/provider-normalization";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getIntegrationSummaries } from "./integration-framework";
import { assertActorUserId, requirePermission, safelyLogAudit } from "./identity";
import { getSession, updateImportedSessionSchedule } from "./sessions";

type ConflictRow = { id: string; organization_id: string; connection_id: string | null; canonical_entity_id: string; entity_type: string; field_name: string; provider_a: string; provider_a_value: unknown; provider_b: string; provider_b_value: unknown; canonical_value: unknown; severity: "CRITICAL" | "IMPORTANT" | "INFORMATIONAL"; resolution_state: "OPEN" | "AUTO_RESOLVED" | "MANUALLY_RESOLVED" | "IGNORED"; resolution_action: string | null; resolution_value: unknown; detected_at: string; resolved_by: string | null; resolved_at: string | null; updated_at: string };
type LinkRow = { id: string; organization_id: string; connection_id: string; provider_key: string; entity_type: string; canonical_entity_id: string; external_id: string; sync_status: string; last_synced_at: string; confidence: string };
type DuplicateRow = { id: string; organization_id: string; entity_type: string; confidence: string; match_evidence: unknown; review_state: string; created_at: string };
type MappingRow = { id: string; organization_id: string | null; venue_id: string | null; connection_id: string | null; provider_key: string; mapping_type: string; external_id: string; external_label: string | null; internal_resource_type: string; internal_resource_id: string | null; mapping_status: string; updated_at: string };
type RunRow = { id: string; organization_id: string | null; connection_id: string | null; provider_key: string | null; run_status: string; trigger_type: string; entities_received: number; records_created: number; records_updated: number; records_unchanged: number; conflicts_detected: number; duplicate_candidates: number; records_rejected: number; canonical_changes_emitted: number; started_at: string; completed_at: string | null; duration_ms: number | null; error_message: string | null };
type ConnectionScopeRow = { id: string; organization_id: string | null; venue_id: string | null; provider_key: string; connection_status: string; enabled: boolean; last_attempted_sync_at: string | null; last_successful_sync_at: string | null; consecutive_error_count: number; error_message: string | null };

type QualityTables = {
  integration_provider_conflicts: { Row: ConflictRow; Insert: Partial<ConflictRow>; Update: Partial<ConflictRow>; Relationships: [] };
  integration_external_entity_links: { Row: LinkRow; Insert: Partial<LinkRow>; Update: Partial<LinkRow>; Relationships: [] };
  integration_duplicate_candidates: { Row: DuplicateRow; Insert: Partial<DuplicateRow>; Update: Partial<DuplicateRow>; Relationships: [] };
  integration_mappings: { Row: MappingRow; Insert: Partial<MappingRow>; Update: Partial<MappingRow>; Relationships: [] };
  integration_sync_runs: { Row: RunRow; Insert: Partial<RunRow>; Update: Partial<RunRow>; Relationships: [] };
  integration_connections: { Row: ConnectionScopeRow; Insert: Partial<ConnectionScopeRow>; Update: Partial<ConnectionScopeRow>; Relationships: [] };
};
type QualityDatabase = { public: { Tables: QualityTables; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };

function getClient() { return getSupabaseAdminClient() as unknown as SupabaseClient<QualityDatabase>; }
const conflictSelect = "id,organization_id,connection_id,canonical_entity_id,entity_type,field_name,provider_a,provider_a_value,provider_b,provider_b_value,canonical_value,severity,resolution_state,resolution_action,resolution_value,detected_at,resolved_by,resolved_at,updated_at";
const linkSelect = "id,organization_id,connection_id,provider_key,entity_type,canonical_entity_id,external_id,sync_status,last_synced_at,confidence";
const duplicateSelect = "id,organization_id,entity_type,confidence,match_evidence,review_state,created_at";
const mappingSelect = "id,organization_id,venue_id,connection_id,provider_key,mapping_type,external_id,external_label,internal_resource_type,internal_resource_id,mapping_status,updated_at";
const runSelect = "id,organization_id,connection_id,provider_key,run_status,trigger_type,entities_received,records_created,records_updated,records_unchanged,conflicts_detected,duplicate_candidates,records_rejected,canonical_changes_emitted,started_at,completed_at,duration_ms,error_message";
const scopeSelect = "id,organization_id,venue_id,provider_key,connection_status,enabled,last_attempted_sync_at,last_successful_sync_at,consecutive_error_count,error_message";

export type IntegrationDataQualityDashboard = {
  providers: Array<{ key: string; name: string; mode: string; apiSupportState: string; enabled: boolean; status: string; health: IntegrationHealth; lastAttemptedSyncAt: string | null; lastSuccessfulSyncAt: string | null; conflictCount: number; staleRecords: number; duplicateReviewCount: number; mappingReviewCount: number; mostRecentError: string | null }>;
  conflicts: ConflictRow[];
  duplicateCandidates: DuplicateRow[];
  mappingReviews: MappingRow[];
  syncHistory: RunRow[];
  totals: { criticalConflicts: number; openConflicts: number; staleIntegrations: number; mappingReviews: number; duplicateCandidates: number; failedRecords: number; orphanedLinks: number };
};

export async function getIntegrationDataQualityDashboard(actorUserId: string): Promise<IntegrationDataQualityDashboard> {
  const actor = assertActorUserId(actorUserId);
  const summaries = await getIntegrationSummaries(actor);
  const connectionIds = summaries.flatMap((summary) => summary.connection ? [summary.connection.id] : []);
  const supabase = getClient();
  const empty = { data: [] as never[], error: null };
  const [scopeResult, conflictResult, linkResult, duplicateResult, mappingResult, runResult] = connectionIds.length ? await Promise.all([
    supabase.from("integration_connections").select(scopeSelect).in("id", connectionIds),
    supabase.from("integration_provider_conflicts").select(conflictSelect).in("connection_id", connectionIds).order("detected_at", { ascending: false }).limit(100),
    supabase.from("integration_external_entity_links").select(linkSelect).in("connection_id", connectionIds).limit(2000),
    supabase.from("integration_duplicate_candidates").select(duplicateSelect).eq("review_state", "OPEN").order("created_at", { ascending: false }).limit(100),
    supabase.from("integration_mappings").select(mappingSelect).in("connection_id", connectionIds).eq("mapping_status", "needs_review").order("updated_at", { ascending: false }).limit(100),
    supabase.from("integration_sync_runs").select(runSelect).in("connection_id", connectionIds).order("started_at", { ascending: false }).limit(100),
  ]) : [empty, empty, empty, empty, empty, empty];
  for (const result of [scopeResult, conflictResult, linkResult, duplicateResult, mappingResult, runResult]) if (result.error) throw new Error(result.error.message);
  const scopes = (scopeResult.data || []) as ConnectionScopeRow[];
  const allowedOrganizationIds = new Set(scopes.map((scope) => scope.organization_id).filter((value): value is string => Boolean(value)));
  const conflicts = (conflictResult.data || []) as ConflictRow[];
  const links = (linkResult.data || []) as LinkRow[];
  // Duplicate candidates are organization-scoped rather than connection-scoped.
  // The service-role client must never project another tenant's review queue.
  const duplicateCandidates = ((duplicateResult.data || []) as DuplicateRow[]).filter((candidate) => allowedOrganizationIds.has(candidate.organization_id));
  const mappingReviews = (mappingResult.data || []) as MappingRow[];
  const syncHistory = (runResult.data || []) as RunRow[];
  const providers = summaries.map((summary) => {
    const scope = scopes.find((row) => row.id === summary.connection?.id);
    const health = integrationHealth({ provider: summary.provider.key, enabled: summary.provider.enabled && (scope?.enabled ?? true), connected: scope?.connection_status === "connected" || (!summary.connection && summary.provider.integrationMode === "NATIVE"), lastSuccessfulSyncAt: scope?.last_successful_sync_at, lastAttemptedSyncAt: scope?.last_attempted_sync_at, errorCount: scope?.consecutive_error_count });
    const providerConflicts = conflicts.filter((row) => row.connection_id === summary.connection?.id && row.resolution_state === "OPEN");
    return { key: summary.provider.key, name: summary.provider.name, mode: summary.provider.integrationMode, apiSupportState: summary.provider.apiSupportState, enabled: summary.provider.enabled, status: scope?.connection_status || summary.status, health, lastAttemptedSyncAt: scope?.last_attempted_sync_at || null, lastSuccessfulSyncAt: scope?.last_successful_sync_at || summary.connection?.lastSyncAt || null, conflictCount: providerConflicts.length, staleRecords: links.filter((row) => row.connection_id === summary.connection?.id && row.sync_status === "STALE").length, duplicateReviewCount: duplicateCandidates.filter((row) => row.organization_id === scope?.organization_id).length, mappingReviewCount: mappingReviews.filter((row) => row.connection_id === summary.connection?.id).length, mostRecentError: scope?.error_message || summary.connection?.errorMessage || null };
  });
  return {
    providers,
    conflicts,
    duplicateCandidates,
    mappingReviews,
    syncHistory,
    totals: {
      criticalConflicts: conflicts.filter((row) => row.resolution_state === "OPEN" && row.severity === "CRITICAL").length,
      openConflicts: conflicts.filter((row) => row.resolution_state === "OPEN").length,
      staleIntegrations: providers.filter((provider) => provider.health === "STALE").length,
      mappingReviews: mappingReviews.length,
      duplicateCandidates: duplicateCandidates.length,
      failedRecords: syncHistory.reduce((sum, run) => sum + run.records_rejected, 0),
      orphanedLinks: links.filter((row) => !row.canonical_entity_id).length,
    },
  };
}

async function requireConnectionMutation(actor: string, connectionId: string | null) {
  if (!connectionId) throw new Error("Integration record is missing a connection scope.");
  const { data, error } = await getClient().from("integration_connections").select(scopeSelect).eq("id", connectionId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Integration connection not found.");
  try {
    if (data.venue_id) await requirePermission(actor, "integrations.edit", "venue", data.venue_id);
    else if (data.organization_id) await requirePermission(actor, "integrations.edit", "organization", data.organization_id);
    else await requirePermission(actor, "integrations.edit", "platform", platformScopeSentinel);
  } catch (permissionError) {
    // Platform-scoped integration admins may resolve cross-tenant provider
    // ambiguity; everyone else remains bound to the connection's exact scope.
    await requirePermission(actor, "integrations.edit", "platform", platformScopeSentinel);
  }
  return data;
}

export async function resolveProviderConflict(input: { conflictId: string; action: "keep_current" | "choose_provider_a" | "choose_provider_b" | "ignore" }, actorUserId: string) {
  const actor = assertActorUserId(actorUserId);
  const supabase = getClient();
  const { data: conflict, error } = await supabase.from("integration_provider_conflicts").select(conflictSelect).eq("id", input.conflictId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!conflict) throw new Error("Provider conflict not found.");
  const scope = await requireConnectionMutation(actor, conflict.connection_id);
  const value = input.action === "choose_provider_a" ? conflict.provider_a_value : input.action === "choose_provider_b" ? conflict.provider_b_value : conflict.canonical_value;
  const state = input.action === "ignore" ? "IGNORED" : "MANUALLY_RESOLVED";
  if (input.action === "choose_provider_a" || input.action === "choose_provider_b") await applyResolvedEventValue(conflict, value);
  const now = new Date().toISOString();
  const { error: updateError } = await supabase.from("integration_provider_conflicts").update({ resolution_state: state, resolution_action: input.action, resolution_value: value, resolved_by: actor, resolved_at: now, updated_at: now }).eq("id", conflict.id).eq("organization_id", conflict.organization_id);
  if (updateError) throw new Error(updateError.message);
  await safelyLogAudit({ action: "provider_conflict.resolved", actorUserId: actor, metadata: { action: input.action, field: conflict.field_name, providerA: conflict.provider_a, providerB: conflict.provider_b }, resourceId: conflict.id, resourceType: "integration_provider_conflict", scopeId: scope.venue_id || scope.organization_id, scopeType: scope.venue_id ? "venue" : "organization" });
}

async function applyResolvedEventValue(conflict: ConflictRow, value: unknown) {
  if (conflict.entity_type !== "event") return;
  const supportedTimeField = conflict.field_name === "start_time" || conflict.field_name === "startsAt";
  const supportedVenueField = conflict.field_name === "field" || conflict.field_name === "field_id" || conflict.field_name === "fieldName";
  if (!supportedTimeField && !supportedVenueField) return;
  const session = await getSession(conflict.canonical_entity_id);
  if (!session || session.organizationId !== conflict.organization_id) throw new Error("The canonical event is outside this integration tenant.");
  let startTime = session.startTime;
  let fieldId = session.fieldId;
  if (supportedTimeField) {
    if (typeof value !== "string" || !Number.isFinite(new Date(value).getTime())) throw new Error("The provider time is invalid.");
    startTime = new Date(value).toISOString();
  }
  if (supportedVenueField) {
    if (typeof value !== "string" || !value.trim()) throw new Error("The provider field is invalid.");
    const supabase = getSupabaseAdminClient();
    let fieldQuery = supabase.from("fields").select("id,organization_id").eq("organization_id", conflict.organization_id);
    fieldQuery = /^[0-9a-f-]{36}$/i.test(value) ? fieldQuery.eq("id", value) : fieldQuery.eq("name", value.trim());
    const { data: field, error: fieldError } = await fieldQuery.limit(1).maybeSingle();
    if (fieldError) throw new Error(fieldError.message);
    if (!field) throw new Error("The provider field is not mapped inside this integration tenant.");
    fieldId = field.id;
  }
  await updateImportedSessionSchedule(session.id, {
    field_id: fieldId,
    title: session.title,
    sport_type: session.sportType,
    home_team: session.homeTeam,
    away_team: session.awayTeam,
    start_time: startTime,
    end_time: session.endTime,
    external_source: session.externalSource,
    external_source_id: session.externalSourceId,
    external_source_url: session.externalSourceUrl,
    notes: session.notes,
  });
}

export async function reviewProviderMapping(input: { mappingId: string; action: "approve" | "reject" }, actorUserId: string) {
  const actor = assertActorUserId(actorUserId);
  const supabase = getClient();
  const { data: mapping, error } = await supabase.from("integration_mappings").select(mappingSelect).eq("id", input.mappingId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!mapping) throw new Error("Provider mapping not found.");
  if (!mapping.organization_id) throw new Error("Provider mapping is missing its organization scope.");
  const scope = await requireConnectionMutation(actor, mapping.connection_id);
  const now = new Date().toISOString();
  const { error: updateError } = await supabase.from("integration_mappings").update({ mapping_status: input.action === "approve" ? "active" : "ignored", updated_at: now }).eq("id", mapping.id).eq("organization_id", mapping.organization_id);
  if (updateError) throw new Error(updateError.message);
  await safelyLogAudit({ action: input.action === "approve" ? "provider_mapping.approved" : "provider_mapping.rejected", actorUserId: actor, metadata: { externalId: mapping.external_id, provider: mapping.provider_key }, resourceId: mapping.id, resourceType: "integration_mapping", scopeId: scope.venue_id || scope.organization_id, scopeType: scope.venue_id ? "venue" : "organization" });
}
