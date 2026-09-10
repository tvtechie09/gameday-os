import "server-only";

import { isPlatformAdmin } from "@/lib/access/capabilities";
import { getSessionContext } from "@/lib/access/session";
import { classifyLegacyPerson, maskLegacyIdentifier, summarizeLegacyDecisions, type LegacyPersonInput } from "@/lib/legacy-identity-reconciliation-core";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;
type Result = { data: Row[] | null; error: { message: string } | null };
type Query = {
  select: (columns: string) => Query;
  eq: (column: string, value: string | boolean) => Query;
  neq: (column: string, value: string) => Query;
  order: (column: string, options?: { ascending?: boolean }) => Query;
  range: (from: number, to: number) => Query;
  limit: (count: number) => Query;
  then: PromiseLike<Result>["then"];
};

function db() { return getSupabaseAdminClient() as unknown as { from: (table: string) => Query }; }

export class LegacyReconciliationAuthorizationError extends Error {}

async function requirePreviewAdmin() {
  const ctx = await getSessionContext();
  if (!ctx || !isPlatformAdmin(ctx) || ctx.isImpersonating) throw new LegacyReconciliationAuthorizationError("Platform administrator access is required.");
}

async function run(query: Query, label: string): Promise<Row[]> {
  const { data, error } = await query;
  if (error) throw new Error(`Legacy reconciliation ${label} unavailable.`);
  return data ?? [];
}

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function normalized(value: unknown) { return text(value).trim().toLowerCase(); }

export async function previewLegacyIdentityReconciliation(stateId: string, page = 1, pageSize = 50) {
  await requirePreviewAdmin();
  const safeStateId = stateId.trim();
  if (!safeStateId) throw new LegacyReconciliationAuthorizationError("A legacy state ID is required.");
  const boundedSize = Math.max(1, Math.min(pageSize, 100));
  const boundedPage = Math.max(1, page);
  const from = (boundedPage - 1) * boundedSize;

  const mappings = await run(db().from("platform_organization_legacy_mappings").select("organization_id,legacy_system,legacy_namespace,legacy_id,active,updated_at").eq("legacy_system", "gameday_team").eq("legacy_namespace", "state_id").eq("legacy_id", safeStateId).eq("active", true).limit(2), "organization mapping");
  const organizationId = mappings.length === 1 ? text(mappings[0].organization_id) : null;
  const people = await run(db().from("gdt_people").select("state_id,id,type,display_name,email,phone,source,is_seed,is_sandbox,updated_at").eq("state_id", safeStateId).order("id", { ascending: true }).range(from, from + boundedSize - 1), "people");

  const [legacyLinks, sourceIdentities, identifiers, separationRules, guardianRelationships, players] = organizationId ? await Promise.all([
    run(db().from("person_legacy_links").select("person_id,legacy_system,legacy_tenant_key,legacy_person_id,created_at").eq("legacy_system", "gameday_team").eq("legacy_tenant_key", safeStateId).limit(5000), "legacy links"),
    run(db().from("person_source_identities").select("id,organization_id,person_id,provider,provider_connection_key,external_person_id,status,updated_at").eq("organization_id", organizationId).eq("provider", "gameday_team").limit(5000), "source identities"),
    run(db().from("person_identifiers").select("person_id,organization_id,identifier_type,normalized_value,verification_status,updated_at").eq("organization_id", organizationId).neq("verification_status", "unverified").limit(5000), "verified identifiers"),
    run(db().from("identity_separation_rules").select("source_identity_id,person_id,organization_id,active,updated_at").eq("organization_id", organizationId).eq("active", true).limit(5000), "separation rules"),
    run(db().from("gdt_guardian_relationships").select("guardian_person_id,player_id,state_id,relationship_type,updated_at").eq("state_id", safeStateId).limit(5000), "guardian relationships"),
    run(db().from("gdt_players").select("id,person_id,state_id,archived,updated_at").eq("state_id", safeStateId).limit(5000), "players"),
  ]) : [[], [], [], [], [], []];

  const playerPersonById = new Map(players.map((row) => [text(row.id), text(row.person_id)]));
  const decisions = people.map((row) => {
    const legacyPersonId = text(row.id);
    const source = text(row.source) || "local";
    const sourceIdentity = sourceIdentities.find((candidate) => text(candidate.provider_connection_key) === safeStateId && text(candidate.external_person_id) === legacyPersonId);
    const email = normalized(row.email);
    const phone = text(row.phone).replace(/\D/g, "");
    const possible = identifiers.filter((candidate) => {
      if (candidate.identifier_type === "email") return Boolean(email) && normalized(candidate.normalized_value) === email;
      if (candidate.identifier_type === "phone") return Boolean(phone) && text(candidate.normalized_value).replace(/\D/g, "") === phone;
      return false;
    }).map((candidate) => text(candidate.person_id));
    const sourceId = sourceIdentity ? text(sourceIdentity.id) : "";
    const separated = separationRules.filter((rule) => text(rule.source_identity_id) === sourceId).map((rule) => text(rule.person_id));
    const relationshipCount = guardianRelationships.filter((relationship) => text(relationship.guardian_person_id) === legacyPersonId || playerPersonById.get(text(relationship.player_id)) === legacyPersonId).length;
    const person: LegacyPersonInput = {
      legacyPersonId,
      stateId: safeStateId,
      source,
      sourceKey: ["import", "imported", "csv", "roster_csv"].includes(source.toLowerCase()) ? null : `${safeStateId}:${legacyPersonId}`,
      synthetic: Boolean(row.is_seed || row.is_sandbox),
      email: text(row.email) || null,
      phone: text(row.phone) || null,
      updatedAt: text(row.updated_at),
    };
    const decision = classifyLegacyPerson(person, {
      organizationId,
      existingCanonicalPersonId: text(legacyLinks.find((link) => text(link.legacy_person_id) === legacyPersonId)?.person_id) || null,
      durableSourceCanonicalPersonId: text(sourceIdentity?.person_id) || null,
      possibleCanonicalPersonIds: possible,
      separatedCanonicalPersonIds: separated,
      relationshipCount,
    });
    return { ...decision, legacyType: text(row.type), source, maskedEmail: maskLegacyIdentifier(text(row.email)), maskedPhone: maskLegacyIdentifier(text(row.phone)) };
  });

  return {
    format: "gameday-legacy-reconciliation-manifest-v1",
    generatedAt: new Date().toISOString(),
    stateId: safeStateId,
    organizationId,
    page: boundedPage,
    pageSize: boundedSize,
    decisions,
    counts: summarizeLegacyDecisions(decisions),
    projectedReviewVolume: decisions.filter((decision) => decision.classification === "POSSIBLE_MATCH" || decision.classification === "CONFLICTING_STRONG_IDENTIFIER").length,
    executionEnabled: false,
  };
}
