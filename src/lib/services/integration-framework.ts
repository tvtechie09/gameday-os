import type { SupabaseClient } from "@supabase/supabase-js";
import { getProviderEnvStatus, integrationProviders, type IntegrationConnectionStatus, type IntegrationProviderKey, type IntegrationProviderStatus, type IntegrationSyncStatus } from "@/lib/integration-framework";
import { platformScopeSentinel } from "@/lib/access/demo-users";
import { getCurrentOrganizationScope } from "@/lib/organization-scope";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { assertActorUserId, PermissionDeniedError, requirePermission, safelyLogAudit } from "./identity";

type ConnectionRow = {
  id: string;
  organization_id: string | null;
  venue_id: string | null;
  tournament_id: string | null;
  provider_key: string;
  provider_name: string | null;
  connection_status: IntegrationConnectionStatus;
  auth_type: string | null;
  auth_status: string;
  external_account_id: string | null;
  external_account_name: string | null;
  external_org_id: string | null;
  source_url: string | null;
  last_sync_at: string | null;
  disconnected_at: string | null;
  error_message: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type SyncRunRow = {
  id: string;
  connection_id: string | null;
  provider_key: string | null;
  run_status: IntegrationSyncStatus;
  sync_type: string;
  idempotency_key: string | null;
  source: string | null;
  records_found: number;
  records_imported: number;
  records_skipped: number;
  records_missing_mapping: number;
  retry_count: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  created_by: string | null;
};

type SyncLogRow = {
  id: string;
  sync_run_id: string | null;
  connection_id: string | null;
  provider_key: string | null;
  log_level: "debug" | "info" | "warning" | "error";
  message: string;
  metadata: Json;
  created_at: string;
};

type IntegrationTables = {
  integration_connections: { Row: ConnectionRow; Insert: Partial<ConnectionRow>; Update: Partial<ConnectionRow>; Relationships: [] };
  integration_sync_runs: { Row: SyncRunRow; Insert: Partial<SyncRunRow>; Update: Partial<SyncRunRow>; Relationships: [] };
  integration_sync_logs: { Row: SyncLogRow; Insert: Partial<SyncLogRow>; Update: Partial<SyncLogRow>; Relationships: [] };
};

type IntegrationDatabase = { public: { Tables: IntegrationTables; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };
type IntegrationClient = SupabaseClient<IntegrationDatabase>;

export type IntegrationConnection = {
  id: string;
  organizationId: string | null;
  venueId: string | null;
  tournamentId: string | null;
  providerKey: string;
  providerName: string | null;
  connectionStatus: IntegrationConnectionStatus;
  authType: string | null;
  authStatus: string;
  externalAccountId: string | null;
  externalAccountName: string | null;
  externalOrgId: string | null;
  sourceUrl: string | null;
  lastSyncAt: string | null;
  disconnectedAt: string | null;
  errorMessage: string | null;
  notes: string | null;
  updatedAt: string;
};

export type IntegrationSummary = IntegrationProviderStatus & {
  connection: IntegrationConnection | null;
};

export type IntegrationRunLog = {
  id: string;
  syncRunId: string | null;
  connectionId: string | null;
  providerKey: string | null;
  logLevel: string;
  message: string;
  metadata: Json;
  createdAt: string;
};

const connectionSelect = "id,organization_id,venue_id,tournament_id,provider_key,provider_name,connection_status,auth_type,auth_status,external_account_id,external_account_name,external_org_id,source_url,last_sync_at,disconnected_at,error_message,notes,created_by,updated_by,created_at,updated_at";
const syncRunSelect = "id,connection_id,provider_key,run_status,sync_type,idempotency_key,source,records_found,records_imported,records_skipped,records_missing_mapping,retry_count,started_at,completed_at,error_message,created_by";
const syncLogSelect = "id,sync_run_id,connection_id,provider_key,log_level,message,metadata,created_at";

function getClient() {
  return getSupabaseAdminClient() as unknown as IntegrationClient;
}

function mapConnection(row: ConnectionRow): IntegrationConnection {
  return {
    authStatus: row.auth_status,
    authType: row.auth_type,
    connectionStatus: row.connection_status,
    disconnectedAt: row.disconnected_at,
    errorMessage: row.error_message,
    externalAccountId: row.external_account_id,
    externalAccountName: row.external_account_name,
    externalOrgId: row.external_org_id,
    id: row.id,
    lastSyncAt: row.last_sync_at,
    notes: row.notes,
    organizationId: row.organization_id,
    providerKey: row.provider_key,
    providerName: row.provider_name,
    sourceUrl: row.source_url,
    tournamentId: row.tournament_id,
    updatedAt: row.updated_at,
    venueId: row.venue_id,
  };
}

function mapLog(row: SyncLogRow): IntegrationRunLog {
  return { connectionId: row.connection_id, createdAt: row.created_at, id: row.id, logLevel: row.log_level, message: row.message, metadata: row.metadata, providerKey: row.provider_key, syncRunId: row.sync_run_id };
}

async function requireScopePermission(actor: string, permissionKey: string, connection?: IntegrationConnection | null, fallbackScope?: { organizationId?: string | null; venueId?: string | null; tournamentId?: string | null }) {
  const venueId = connection?.venueId ?? fallbackScope?.venueId;
  const tournamentId = connection?.tournamentId ?? fallbackScope?.tournamentId;
  const organizationId = connection?.organizationId ?? fallbackScope?.organizationId;
  try {
    if (venueId) return await requirePermission(actor, permissionKey, "venue", venueId);
    if (tournamentId) return await requirePermission(actor, permissionKey, "tournament", tournamentId);
    if (organizationId) return await requirePermission(actor, permissionKey, "organization", organizationId);
    return await requirePermission(actor, permissionKey, "platform", platformScopeSentinel);
  } catch (error) {
    if (!(error instanceof PermissionDeniedError)) throw error;
    // A real platform-scoped admin is the cross-tenant integration operator.
    // Lower roles still require the exact connection object scope above.
    return requirePermission(actor, permissionKey, "platform", platformScopeSentinel);
  }
}

export async function getIntegrationSummaries(actorUserId: string): Promise<IntegrationSummary[]> {
  const actor = assertActorUserId(actorUserId);
  const supabase = getClient();
  const organizationId = await getCurrentOrganizationScope();
  let query = supabase.from("integration_connections").select(connectionSelect).order("updated_at", { ascending: false });
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const connections = ((data ?? []) as unknown as ConnectionRow[]).map(mapConnection);
  const summaries: IntegrationSummary[] = [];
  for (const provider of integrationProviders) {
    const connection = connections.find((item) => item.providerKey === provider.key) ?? null;
    try {
      if (connection) await requireScopePermission(actor, "integrations.view", connection);
      summaries.push({ ...getProviderEnvStatus(provider), connection });
    } catch (permissionError) {
      if (!(permissionError instanceof PermissionDeniedError)) throw permissionError;
    }
  }
  return summaries;
}

export async function getIntegrationProviderStatus(providerKey: string, actorUserId: string) {
  const provider = integrationProviders.find((item) => item.key === providerKey);
  if (!provider) throw new Error("Integration provider not found.");
  const summaries = await getIntegrationSummaries(actorUserId);
  return summaries.find((summary) => summary.provider.key === provider.key) ?? { ...getProviderEnvStatus(provider), connection: null };
}

export async function createIntegrationConnection(input: { providerKey: IntegrationProviderKey; organizationId?: string | null; venueId?: string | null; tournamentId?: string | null; externalAccountId?: string | null; externalAccountName?: string | null; externalOrgId?: string | null; sourceUrl?: string | null; notes?: string | null }, actorUserId: string) {
  const provider = integrationProviders.find((item) => item.key === input.providerKey);
  if (!provider) throw new Error("Integration provider not found.");
  const actor = assertActorUserId(actorUserId);
  await requireScopePermission(actor, "integrations.connect", null, input);
  const providerStatus = getProviderEnvStatus(provider);
  const supabase = getClient();
  const { data, error } = await supabase.from("integration_connections").insert({
    auth_status: providerStatus.status,
    auth_type: provider.authType,
    connection_status: providerStatus.status,
    created_by: actor,
    error_message: providerStatus.status === "credentials_missing" ? providerStatus.message : null,
    external_account_id: input.externalAccountId ?? null,
    external_account_name: input.externalAccountName ?? null,
    external_org_id: input.externalOrgId ?? null,
    notes: input.notes ?? null,
    organization_id: input.organizationId ?? null,
    provider_key: provider.key,
    provider_name: provider.name,
    source_url: input.sourceUrl ?? null,
    tournament_id: input.tournamentId ?? null,
    updated_by: actor,
    venue_id: input.venueId ?? null,
  }).select(connectionSelect).single();
  if (error) throw new Error(error.message);
  const connection = mapConnection(data as unknown as ConnectionRow);
  await safelyLogAudit({ action: "integration.connect", actorUserId: actor, metadata: { providerKey: provider.key, status: connection.connectionStatus }, resourceId: connection.id, resourceType: "integration_connection", scopeId: connection.venueId ?? connection.tournamentId ?? connection.organizationId, scopeType: connection.venueId ? "venue" : connection.tournamentId ? "tournament" : "organization" });
  return connection;
}

export async function disconnectIntegration(providerKey: string, actorUserId: string) {
  const status = await getIntegrationProviderStatus(providerKey, actorUserId);
  if (!status.connection) throw new Error("Integration connection not found.");
  const actor = assertActorUserId(actorUserId);
  await requireScopePermission(actor, "integrations.disconnect", status.connection);
  const supabase = getClient();
  const { data, error } = await supabase.from("integration_connections").update({ connection_status: "disconnected", disconnected_at: new Date().toISOString(), updated_at: new Date().toISOString(), updated_by: actor }).eq("id", status.connection.id).select(connectionSelect).single();
  if (error) throw new Error(error.message);
  await safelyLogAudit({ action: "integration.disconnect", actorUserId: actor, metadata: { providerKey }, resourceId: status.connection.id, resourceType: "integration_connection", scopeId: status.connection.venueId ?? status.connection.tournamentId ?? status.connection.organizationId, scopeType: status.connection.venueId ? "venue" : status.connection.tournamentId ? "tournament" : "organization" });
  return mapConnection(data as unknown as ConnectionRow);
}

export async function runIntegrationSync(providerKey: string, actorUserId: string, idempotencyKey?: string | null) {
  const status = await getIntegrationProviderStatus(providerKey, actorUserId);
  if (!status.connection) throw new Error("Integration connection not found.");
  const actor = assertActorUserId(actorUserId);
  await requireScopePermission(actor, "integrations.sync", status.connection);
  const supabase = getClient();
  const key = idempotencyKey || `${providerKey}:${status.connection.id}:${new Date().toISOString().slice(0, 16)}`;
  const { data: existingRun } = await supabase.from("integration_sync_runs").select(syncRunSelect).eq("connection_id", status.connection.id).eq("idempotency_key", key).maybeSingle();
  if (existingRun) return existingRun as unknown as SyncRunRow;

  const canSync = status.connection.connectionStatus === "connected";
  const message = canSync ? "Provider sync adapter is not implemented yet." : `Cannot sync ${status.provider.name}: ${status.connection.errorMessage || status.message}`;
  const runStatus: IntegrationSyncStatus = "failed";
  const { data, error } = await supabase.from("integration_sync_runs").insert({ completed_at: new Date().toISOString(), connection_id: status.connection.id, created_by: actor, error_message: message, idempotency_key: key, provider_key: providerKey, run_status: runStatus, source: "admin_manual", sync_type: "manual" }).select(syncRunSelect).single();
  if (error) throw new Error(error.message);
  const run = data as unknown as SyncRunRow;
  await writeIntegrationLog({ connectionId: status.connection.id, level: "error", message, metadata: { providerKey, status: status.connection.connectionStatus }, providerKey, runId: run.id });
  await safelyLogAudit({ action: "integration.sync_failed", actorUserId: actor, metadata: { idempotencyKey: key, providerKey, reason: message }, resourceId: status.connection.id, resourceType: "integration_connection", scopeId: status.connection.venueId ?? status.connection.tournamentId ?? status.connection.organizationId, scopeType: status.connection.venueId ? "venue" : status.connection.tournamentId ? "tournament" : "organization" });
  return run;
}

export async function getIntegrationLogs(providerKey: string, actorUserId: string) {
  const status = await getIntegrationProviderStatus(providerKey, actorUserId);
  if (!status.connection) return [];
  const actor = assertActorUserId(actorUserId);
  await requireScopePermission(actor, "integrations.view_logs", status.connection);
  const supabase = getClient();
  const { data, error } = await supabase.from("integration_sync_logs").select(syncLogSelect).eq("connection_id", status.connection.id).order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as SyncLogRow[]).map(mapLog);
}

async function writeIntegrationLog(input: { runId?: string | null; connectionId?: string | null; providerKey: string; level: SyncLogRow["log_level"]; message: string; metadata?: Json }) {
  const supabase = getClient();
  const { error } = await supabase.from("integration_sync_logs").insert({ connection_id: input.connectionId ?? null, log_level: input.level, message: input.message, metadata: input.metadata ?? {}, provider_key: input.providerKey, sync_run_id: input.runId ?? null });
  if (error) console.error("Failed to write integration log", error);
}
