import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { IdentifierVerification, PersonIdentifierType, RelationshipType } from "@/lib/platform-identity";

export type PlatformOrganizationContext =
  | { status: "resolved"; organizationId: string }
  | { status: "unmapped" | "inactive" | "ambiguous" | "invalid"; organizationId: null };

export type NormalizedProviderPersonInput = {
  provider: string;
  providerConnectionKey: string;
  externalPersonId: string;
  organizationId: string;
  displayName: string;
  personType?: string;
  identifiers: Array<{
    type: PersonIdentifierType;
    value: string;
    verificationStatus?: IdentifierVerification;
    verificationEvidence?: string;
  }>;
  relationships?: Array<{
    relationshipType: RelationshipType;
    relatedPersonId?: string;
    relatedEntityType: "person" | "team" | "organization" | "event";
    relatedEntityId: string;
  }>;
  facts?: Array<{
    domain: string;
    key: string;
    value: unknown;
    externalRecordRef?: string;
    sourceTimestamp?: string;
  }>;
  legacyPersonMapping?: {
    legacySystem: string;
    legacyTenantKey: string;
    legacyPersonId: string;
  };
  sourceMetadata?: Record<string, unknown>;
  sourceUpdatedAt?: string;
};

export type PersistentIdentityResolution = {
  outcome: "LINKED" | "POSSIBLE_MATCH" | "DISTINCT";
  personId: string | null;
  sourceIdentityId: string;
  candidatePersonIds: string[];
  reasonCodes: string[];
  confidence: "deterministic" | "candidate" | "none";
};

type RpcClient = Pick<SupabaseClient, "rpc">;

function safeInput(input: NormalizedProviderPersonInput): NormalizedProviderPersonInput {
  const reviewIdentifiers = input.identifiers.map((identifier) => {
    const value = identifier.value.trim();
    const maskedValue = identifier.type === "email"
      ? (value.split("@")[0]?.slice(0, 1) || "*") + "***@" + (value.split("@")[1] || "unknown")
      : "***-***-" + value.replace(/\D/g, "").slice(-4).padStart(4, "*");
    return {
      type: identifier.type,
      maskedValue,
      verificationStatus: identifier.verificationStatus ?? "unverified",
    };
  });
  return {
    ...input,
    provider: input.provider.trim().toLowerCase(),
    providerConnectionKey: input.providerConnectionKey.trim(),
    externalPersonId: input.externalPersonId.trim(),
    displayName: input.displayName.trim(),
    identifiers: input.identifiers.map((identifier) => ({
      ...identifier,
      verificationStatus: identifier.verificationStatus === "provider_verified" && !identifier.verificationEvidence?.trim()
        ? "unverified"
        : identifier.verificationStatus ?? "unverified",
    })),
    sourceMetadata: {
      ...(input.sourceMetadata ?? {}),
      reviewDisplayName: input.displayName.trim(),
      reviewIdentifiers,
      reviewRelationships: (input.relationships ?? []).map((relationship) => ({
        relationshipType: relationship.relationshipType,
      })),
      ...(input.legacyPersonMapping ? {
        reviewLegacySystem: input.legacyPersonMapping.legacySystem,
        reviewLegacyTenantKey: input.legacyPersonMapping.legacyTenantKey,
        reviewLegacyPersonId: input.legacyPersonMapping.legacyPersonId,
      } : {}),
    },
  };
}

export function createPlatformIdentityRuntime(client: RpcClient = getSupabaseAdminClient()) {
  return {
    async resolveOrganization(input: { legacySystem: string; legacyNamespace: string; legacyId: string }) {
      const { data, error } = await client.rpc("resolve_platform_organization_mapping", {
        p_legacy_system: input.legacySystem,
        p_legacy_namespace: input.legacyNamespace,
        p_legacy_id: input.legacyId,
      });
      if (error) throw new Error(`Platform organization mapping failed: ${error.message}`);
      const result = data as unknown as { status: PlatformOrganizationContext["status"]; organization_id: string | null };
      return { status: result.status, organizationId: result.organization_id } as PlatformOrganizationContext;
    },

    async resolvePerson(input: NormalizedProviderPersonInput) {
      const normalized = safeInput(input);
      const { data, error } = await client.rpc("resolve_platform_person", { p_input: normalized });
      if (error) throw new Error(`Platform identity ingestion failed: ${error.message}`);
      return data as unknown as PersistentIdentityResolution;
    },

    async effectiveValue(input: { organizationId: string; personId: string; factDomain: string; factKey: string }) {
      const { data, error } = await client.rpc("get_platform_person_effective_value", {
        p_organization_id: input.organizationId,
        p_person_id: input.personId,
        p_fact_domain: input.factDomain,
        p_fact_key: input.factKey,
      });
      if (error) throw new Error(`Platform identity Truth query failed: ${error.message}`);
      return data as unknown as null | {
        domain: string;
        key: string;
        label: string;
        effectiveValue: unknown | null;
        effectiveProvider: string | null;
        reasonCode: string;
        conflictState: string;
        effectiveAt: string | null;
        assertions: Array<{ provider: string; value: unknown; timestamp: string; humanConfirmed: boolean }>;
        history: Array<{ provider: string; value: unknown; timestamp: string; status: string; humanConfirmed: boolean }>;
      };
    },

    async reviewCases(organizationId: string) {
      const { data, error } = await client.rpc("list_platform_identity_review_cases", { p_organization_id: organizationId });
      if (error) throw new Error(`Platform identity review query failed: ${error.message}`);
      return data as unknown as Array<{
        caseId: string;
        organizationId: string;
        sourceIdentityId: string;
        provider: string;
        providerConnectionKey: string;
        externalPersonId: string;
        candidatePersonIds: string[];
        reasonCodes: string[];
        confidence: "candidate";
        reviewStatus: "open";
        keepSeparate: boolean;
        updatedAt: string;
      }>;
    },
  };
}

export async function persistNormalizedProviderPeople(
  inputs: NormalizedProviderPersonInput[],
  runtime = createPlatformIdentityRuntime(),
) {
  const results: PersistentIdentityResolution[] = [];
  for (const input of inputs) results.push(await runtime.resolvePerson(input));
  return results;
}
