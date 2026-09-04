import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireIdentityReviewOrganization } from "@/lib/services/platform-identity-review";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type RpcClient = Pick<SupabaseClient, "rpc">;

export type PlatformIdentityTruth = {
  person: { id: string; displayName: string; preferredName: string | null };
  fields: Array<{
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
  }>;
  relationships: Array<{
    relationshipType: string;
    relatedEntityType: string;
    relatedLabel: string;
    provider: string;
    timestamp: string;
    hasDifferentRelationship: boolean;
  }>;
  projectionItems: Array<{
    id: string;
    targetDomain: string;
    operationType: string;
    status: string;
    attemptCount: number;
    lastErrorCode: string | null;
    updatedAt: string;
  }>;
  reviewCases: Array<{ caseId: string; updatedAt: string }>;
  accountClaimed: boolean;
};

export async function getPlatformPersonTruth(
  organizationId: string,
  personId: string,
  client: RpcClient = getSupabaseAdminClient(),
) {
  await requireIdentityReviewOrganization(organizationId);
  const { data, error } = await client.rpc("get_platform_person_truth_summary", {
    p_organization_id: organizationId,
    p_person_id: personId,
    p_history_limit: 5,
  });
  if (error) throw new Error("GameDay Truth is unavailable: " + error.message);
  return (data ?? null) as unknown as PlatformIdentityTruth | null;
}

