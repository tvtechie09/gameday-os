import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getIntegrationProvider, type IntegrationProviderKey } from "@/lib/integration-framework";
import { resolveSafeProviderLink, sanitizeProviderMetadata, stableSourceHash, validateExternalId } from "@/lib/provider-normalization";
import type { ExternalSource, Session } from "@/lib/types";

type ConnectionRow = { id: string; organization_id: string | null; venue_id: string | null; provider_key: string; external_account_id: string | null; provider_name: string | null; connection_status: string; auth_type: string | null; auth_status: string; external_account_name: string | null; source_url: string | null; last_attempted_sync_at: string | null; last_successful_sync_at: string | null; last_sync_at: string | null; expected_cadence_minutes: number; enabled: boolean; consecutive_error_count: number; error_message: string | null; updated_at: string };
type LinkRow = { id: string; organization_id: string; connection_id: string; provider_key: string; entity_type: string; canonical_entity_id: string; external_id: string; external_url: string | null; source_updated_at: string | null; last_synced_at: string; sync_status: string; source_hash: string; confidence: string; match_evidence: unknown; metadata: unknown; updated_at: string };
type LineageDatabase = { public: { Tables: {
  integration_connections: { Row: ConnectionRow; Insert: Partial<ConnectionRow>; Update: Partial<ConnectionRow>; Relationships: [] };
  integration_external_entity_links: { Row: LinkRow; Insert: Partial<LinkRow>; Update: Partial<LinkRow>; Relationships: [] };
}; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };
function getClient() { return getSupabaseAdminClient() as unknown as SupabaseClient<LineageDatabase>; }

function providerKeyForSource(source: ExternalSource): IntegrationProviderKey {
  const key = source.sourceType === "ical" ? "csv" : source.sourceType;
  return getIntegrationProvider(key) ? key as IntegrationProviderKey : "csv";
}

export async function ensureCanonicalImportConnection(source: ExternalSource) {
  if (!source.organizationId) throw new Error("Integration source is missing its organization scope.");
  const supabase = getClient();
  const providerKey = providerKeyForSource(source);
  const provider = getIntegrationProvider(providerKey);
  const { data: existing, error: readError } = await supabase
    .from("integration_connections")
    .select("id,organization_id,venue_id,provider_key,external_account_id")
    .eq("organization_id", source.organizationId)
    .eq("provider_key", providerKey)
    .eq("external_account_id", source.id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing) return existing;
  const { data, error } = await supabase.from("integration_connections").insert({
    organization_id: source.organizationId,
    venue_id: source.venueId,
    provider_key: providerKey,
    provider_name: provider?.name || source.sourceName,
    connection_status: "connected",
    auth_type: provider?.authType || "manual",
    auth_status: "authorized",
    external_account_id: source.id,
    external_account_name: source.sourceName,
    source_url: source.sourceUrl,
    last_attempted_sync_at: source.lastSyncAt,
    last_successful_sync_at: source.lastSyncAt,
    expected_cadence_minutes: providerKey === "csv" ? 10080 : 1440,
    enabled: true,
  }).select("id,organization_id,venue_id,provider_key,external_account_id").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function recordImportedSessionLineage(input: { source: ExternalSource; session: Session; raw?: Record<string, unknown> | null }) {
  if (!input.session.externalSourceId) return;
  if (!input.source.organizationId) throw new Error("Integration source is missing its organization scope.");
  validateExternalId(input.session.externalSourceId);
  const connection = await ensureCanonicalImportConnection(input.source);
  const providerKey = providerKeyForSource(input.source);
  const sourceRecord = {
    externalId: input.session.externalSourceId,
    startsAt: input.session.startTime,
    endTime: input.session.endTime,
    title: input.session.title,
    homeTeam: input.session.homeTeam,
    awayTeam: input.session.awayTeam,
    fieldId: input.session.fieldId,
    status: input.session.status,
    metadata: sanitizeProviderMetadata(input.raw || {}),
  };
  const now = new Date().toISOString();
  const supabase = getClient();
  const { error } = await supabase.from("integration_external_entity_links").upsert({
    organization_id: input.source.organizationId,
    connection_id: connection.id,
    provider_key: providerKey,
    entity_type: "event",
    canonical_entity_id: input.session.id,
    external_id: input.session.externalSourceId,
    external_url: resolveSafeProviderLink(providerKey, input.session.externalSourceUrl) || null,
    source_updated_at: input.source.updatedAt,
    last_synced_at: now,
    sync_status: "SYNCED",
    source_hash: stableSourceHash(sourceRecord),
    confidence: "HIGH",
    match_evidence: { evidence: ["provider external ID", "approved import mapping"] },
    metadata: { field_id: input.session.fieldId },
    updated_at: now,
  }, { onConflict: "connection_id,entity_type,external_id" });
  if (error) throw new Error(error.message);
  await supabase.from("integration_connections").update({
    last_attempted_sync_at: now,
    last_successful_sync_at: now,
    last_sync_at: now,
    consecutive_error_count: 0,
    error_message: null,
    updated_at: now,
  }).eq("id", connection.id);
}
