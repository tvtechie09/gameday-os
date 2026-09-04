import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasPermission, isPlatformAdmin, type AccessContext } from "@/lib/access/capabilities";
import { getSessionContext } from "@/lib/access/session";
import { canReviewIdentityOrganization, IDENTITY_REVIEW_PERMISSION, type IdentityReviewAction, type IdentityReviewFilter } from "@/lib/platform-identity-review";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type RpcClient = Pick<SupabaseClient, "rpc">;

function identityRpcClient(): RpcClient {
  return getSupabaseAdminClient() as unknown as RpcClient;
}

export class IdentityReviewAuthorizationError extends Error {
  constructor(message = "You do not have permission to review identities in this organization.") {
    super(message);
    this.name = "IdentityReviewAuthorizationError";
  }
}

export type IdentityReviewQueueItem = {
  caseId: string;
  organizationId: string;
  sourceIdentityId: string;
  provider: string;
  incomingDisplayName: string;
  candidateCount: number;
  reasonCodes: string[];
  reviewStatus: string;
  deferred: boolean;
  reviewVersion: number;
  resolutionAction: string | null;
  updatedAt: string;
};

export type IdentityReviewCase = {
  caseId: string;
  organizationId: string;
  sourceIdentityId: string;
  provider: string;
  incomingDisplayName: string;
  incomingIdentifiers: Array<{ type: string; maskedValue: string; verificationStatus: string }>;
  relationshipContext: Array<{ relationshipType?: string }>;
  candidatePeople: Array<{
    personId: string;
    displayName: string;
    identifiers: Array<{ type: string; maskedValue: string; verificationStatus: string }>;
    provenanceProviders: string[];
    keepSeparate: boolean;
  }>;
  reasonCodes: string[];
  confidence: string;
  reviewStatus: string;
  deferredAt: string | null;
  reviewVersion: number;
  resolutionAction: string | null;
  updatedAt: string;
  projectionItems: Array<{
    id: string;
    status: string;
    operationType: string;
    attemptCount: number;
    lastErrorCode: string | null;
  }>;
};

function contextCanReviewOrganization(ctx: AccessContext | null, organizationId: string) {
  if (!ctx || !hasPermission(ctx, IDENTITY_REVIEW_PERMISSION)) return false;
  return canReviewIdentityOrganization({
    active: ctx.isActive,
    permissions: ctx.permissions,
    scopeType: isPlatformAdmin(ctx) ? "platform" : ctx.scopeType,
    scopeId: ctx.scopeId,
    targetOrganizationId: organizationId,
  });
}

export async function requireIdentityReviewOrganization(organizationId: string) {
  const ctx = await getSessionContext();
  if (!organizationId || !contextCanReviewOrganization(ctx, organizationId)) {
    throw new IdentityReviewAuthorizationError();
  }
  return ctx as AccessContext;
}

export async function resolveIdentityReviewOrganization(requestedOrganizationId?: string | null) {
  const ctx = await getSessionContext();
  if (!ctx || !hasPermission(ctx, IDENTITY_REVIEW_PERMISSION)) throw new IdentityReviewAuthorizationError();
  if (isPlatformAdmin(ctx) || ctx.scopeType === "platform") {
    if (!requestedOrganizationId) return { ctx, organizationId: null };
    return { ctx, organizationId: requestedOrganizationId };
  }
  if (ctx.scopeType !== "organization") throw new IdentityReviewAuthorizationError();
  if (requestedOrganizationId && requestedOrganizationId !== ctx.scopeId) throw new IdentityReviewAuthorizationError();
  return { ctx, organizationId: ctx.scopeId };
}

export async function listIdentityReviewCases(organizationId: string, filter: IdentityReviewFilter) {
  await requireIdentityReviewOrganization(organizationId);
  const client = identityRpcClient();
  const { data, error } = await client.rpc("list_platform_identity_review_queue", {
    p_organization_id: organizationId,
    p_filter: filter,
  });
  if (error) throw new Error("Identity review queue unavailable: " + error.message);
  return (data ?? []) as unknown as IdentityReviewQueueItem[];
}

export async function getIdentityReviewCase(organizationId: string, caseId: string) {
  await requireIdentityReviewOrganization(organizationId);
  const client = identityRpcClient();
  const { data, error } = await client.rpc("get_platform_identity_review_case", {
    p_organization_id: organizationId,
    p_case_id: caseId,
  });
  if (error) throw new Error("Identity review case unavailable: " + error.message);
  return (data ?? null) as unknown as IdentityReviewCase | null;
}

export async function decideIdentityReviewCase(input: {
  organizationId: string;
  caseId: string;
  action: IdentityReviewAction;
  candidatePersonId?: string | null;
  expectedVersion: number;
  note?: string | null;
}) {
  const ctx = await requireIdentityReviewOrganization(input.organizationId);
  const client = identityRpcClient();
  const { data, error } = await client.rpc("review_platform_identity_case", {
    p_organization_id: input.organizationId,
    p_case_id: input.caseId,
    p_action: input.action,
    p_candidate_person_id: input.candidatePersonId ?? null,
    p_expected_version: input.expectedVersion,
    p_actor_user_id: ctx.userId,
    p_note: input.note?.trim() || null,
  });
  if (error) {
    const stale = error.message.includes("IDENTITY_REVIEW_STALE") || error.message.includes("IDENTITY_REVIEW_ALREADY_RESOLVED");
    throw new Error(stale ? "This case changed after you opened it. Refresh to see the authoritative decision." : "Identity decision failed: " + error.message);
  }
  return data as unknown as { status: string; reviewVersion: number; projectionQueueId: string | null };
}

export async function retryIdentityProjection(organizationId: string, queueId: string) {
  const ctx = await requireIdentityReviewOrganization(organizationId);
  const client = identityRpcClient();
  const { error } = await client.rpc("retry_platform_identity_projection", {
    p_organization_id: organizationId,
    p_queue_id: queueId,
    p_actor_user_id: ctx.userId,
  });
  if (error) throw new Error("Projection retry failed: " + error.message);
}

function safeProjectionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  for (const code of [
    "CANONICAL_STATE_CHANGED", "LEGACY_MAPPING_REQUIRED", "PROJECTION_SOURCE_SCOPE_DENIED",
    "PROJECTION_LEASE_EXPIRED", "PROJECTION_LEASE_NOT_OWNED",
  ]) {
    if (message.includes(code)) return code;
  }
  return "TEMPORARY_PROJECTION_FAILURE";
}

export async function processPlatformIdentityProjectionQueue(input: {
  maxItems?: number;
  client?: RpcClient;
  workerId?: string;
} = {}) {
  const client = input.client ?? identityRpcClient();
  const workerId = input.workerId ?? "venue-identity-" + randomUUID();
  const maximum = Math.max(1, Math.min(input.maxItems ?? 10, 25));
  let completed = 0;
  let failed = 0;
  let retried = 0;

  for (let index = 0; index < maximum; index += 1) {
    const { data: claimed, error: claimError } = await client.rpc("claim_platform_identity_projection", {
      p_worker_id: workerId,
      p_lease_seconds: 120,
    });
    if (claimError) throw new Error("Projection claim failed: " + claimError.message);
    const item = claimed as unknown as null | { id: string };
    if (!item) break;
    const { error: applyError } = await client.rpc("apply_platform_identity_projection", {
      p_queue_id: item.id,
      p_worker_id: workerId,
    });
    if (!applyError) {
      completed += 1;
      continue;
    }
    const errorCode = safeProjectionError(new Error(applyError.message));
    const retryable = errorCode === "TEMPORARY_PROJECTION_FAILURE" || errorCode === "PROJECTION_LEASE_EXPIRED";
    const { data: failureStatus, error: failureError } = await client.rpc("fail_platform_identity_projection", {
      p_queue_id: item.id,
      p_worker_id: workerId,
      p_error_code: errorCode,
      p_retryable: retryable,
    });
    if (failureError) throw new Error("Projection failure recording failed: " + failureError.message);
    if (failureStatus === "RETRY") retried += 1;
    else failed += 1;
  }
  return { completed, failed, retried };
}
