import "server-only";

import { isPlatformAdmin } from "@/lib/access/capabilities";
import { getSessionContext } from "@/lib/access/session";
import { buildPrivacyImpact, type PrivacyRecordCounts } from "@/lib/privacy-lifecycle-core";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Rows = Record<string, unknown>[];
type DynamicQuery = {
  select: (columns: string) => DynamicQuery;
  eq: (column: string, value: string) => DynamicQuery;
  or: (filters: string) => DynamicQuery;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
  then: PromiseLike<{ data: Rows | null; error: { message: string } | null }>["then"];
};

function client() {
  return getSupabaseAdminClient() as unknown as { from: (table: string) => DynamicQuery };
}

export class PrivacyAuthorizationError extends Error {}

async function requirePrivacyAdmin() {
  const ctx = await getSessionContext();
  if (!ctx || !isPlatformAdmin(ctx) || ctx.isImpersonating) throw new PrivacyAuthorizationError("Platform administrator access is required.");
  return ctx;
}

async function rows(table: string, columns: string, scope: (query: DynamicQuery) => DynamicQuery): Promise<Rows> {
  const { data, error } = await scope(client().from(table).select(columns));
  if (error) throw new Error(`Privacy scope unavailable for ${table}.`);
  return data ?? [];
}

export async function buildPersonPrivacyScope(personId: string, organizationId: string) {
  await requirePrivacyAdmin();
  if (!personId || !organizationId) throw new PrivacyAuthorizationError("Person and organization are required.");
  const { data: person, error } = await client().from("people").select("id,organization_id,user_id,display_name,preferred_name,email,phone,person_type,status,created_at,updated_at").eq("id", personId).maybeSingle();
  if (error) throw new Error("Privacy person lookup failed.");
  if (!person) throw new PrivacyAuthorizationError("Person is not available.");

  const organizationLinks = await rows("person_organization_links", "id,person_id,organization_id,status,first_seen_at,last_seen_at", (q) => q.eq("person_id", personId).eq("organization_id", organizationId));
  if (person.organization_id !== organizationId && organizationLinks.length === 0) throw new PrivacyAuthorizationError("Person is not linked to this organization.");

  const [accounts, identifiers, sources, relationships, provenance, legacyLinks, domainPeople, familyMemberships, teamMemberships, projections, auditEvents] = await Promise.all([
    rows("account_people", "id,auth_user_id,user_id,person_id,claim_method,claimed_at,created_at", (q) => q.eq("person_id", personId)),
    rows("person_identifiers", "id,organization_id,source_identity_id,identifier_type,display_value,verification_status,first_seen_at,last_seen_at", (q) => q.eq("person_id", personId).eq("organization_id", organizationId)),
    rows("person_source_identities", "id,organization_id,person_id,provider,external_person_id,status,first_seen_at,last_seen_at", (q) => q.eq("person_id", personId).eq("organization_id", organizationId)),
    rows("person_relationships", "id,organization_id,subject_person_id,relationship_type,related_person_id,related_entity_type,related_entity_id,status", (q) => q.eq("organization_id", organizationId).or(`subject_person_id.eq.${personId},related_person_id.eq.${personId}`)),
    rows("person_provenance_assertions", "id,organization_id,source_identity_id,fact_domain,fact_key,value_hash,source_timestamp,ingested_at,status", (q) => q.eq("person_id", personId).eq("organization_id", organizationId)),
    rows("person_legacy_links", "id,person_id,legacy_system,legacy_tenant_key,legacy_person_id,created_at", (q) => q.eq("person_id", personId)),
    rows("platform_domain_person_projections", "id,organization_id,source_identity_id,target_domain,legacy_system,legacy_tenant_key,legacy_person_id,status,updated_at", (q) => q.eq("canonical_person_id", personId).eq("organization_id", organizationId)),
    rows("family_members", "id,organization_id,family_id,person_id,relationship,is_primary_guardian,created_at", (q) => q.eq("person_id", personId).eq("organization_id", organizationId)),
    rows("team_members", "id,organization_id,team_id,person_id,role_type,status,created_at,updated_at", (q) => q.eq("person_id", personId).eq("organization_id", organizationId)),
    rows("platform_identity_projection_queue", "id,organization_id,canonical_person_id,target_domain,operation_type,status,attempt_count,last_error_code,created_at,updated_at", (q) => q.eq("canonical_person_id", personId).eq("organization_id", organizationId)),
    rows("identity_resolution_events", "id,organization_id,event_type,person_id,source_identity_id,previous_person_id,actor_type,reason_codes,created_at", (q) => q.eq("organization_id", organizationId).or(`person_id.eq.${personId},previous_person_id.eq.${personId}`)),
  ]);

  const counts: PrivacyRecordCounts = {
    accounts: accounts.length,
    identifiers: identifiers.length,
    sourceIdentities: sources.length,
    organizationLinks: organizationLinks.length,
    relationshipsAsSubject: relationships.filter((row) => row.subject_person_id === personId).length,
    relationshipsAsRelated: relationships.filter((row) => row.related_person_id === personId).length,
    provenance: provenance.length,
    legacyLinks: legacyLinks.length,
    domainMemberships: domainPeople.length + familyMemberships.length + teamMemberships.length,
    projectionItems: projections.length,
    auditEvents: auditEvents.length,
  };

  return {
    format: "gameday-person-export-v1",
    generatedAt: new Date().toISOString(),
    person,
    organizationId,
    included: { organizationLinks, accounts, identifiers, sources, relationships, provenanceReferences: provenance, legacyLinks, domainPeople, familyMemberships, teamMemberships, projections },
    excluded: ["authentication secrets", "raw provider configuration", "security and fraud detail", "audit supporting metadata", "other persons' profiles", "provenance asserted values"],
    retainedAuditSummary: { count: auditEvents.length, eventTypes: [...new Set(auditEvents.map((row) => String(row.event_type)))].sort() },
    impact: buildPrivacyImpact(personId, organizationId, counts),
  };
}
