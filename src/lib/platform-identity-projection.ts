export type ProjectionStatus = "PENDING" | "PROCESSING" | "RETRY" | "COMPLETED" | "FAILED";

export type ProjectionQueueItem = {
  id: string;
  organizationId: string;
  canonicalPersonId: string | null;
  sourceIdentityId: string;
  operationType: "ENSURE_PERSON_MAPPING" | "SYNC_RELATIONSHIPS" | "CLEANUP_SOURCE_MAPPING";
  targetDomain: "team_family";
  dedupeKey: string;
  status: ProjectionStatus;
  attemptCount: number;
  availableAt: number;
  lockedBy: string | null;
  leaseExpiresAt: number | null;
  lastErrorCode: string | null;
};

export type ProjectionQueueState = { items: ProjectionQueueItem[] };

export function enqueueProjection(state: ProjectionQueueState, item: Omit<ProjectionQueueItem, "status" | "attemptCount" | "lockedBy" | "leaseExpiresAt" | "lastErrorCode">) {
  const existing = state.items.find((queued) => queued.dedupeKey === item.dedupeKey);
  if (existing) return existing;
  const queued: ProjectionQueueItem = { ...item, status: "PENDING", attemptCount: 0, lockedBy: null, leaseExpiresAt: null, lastErrorCode: null };
  state.items.push(queued);
  return queued;
}

export function claimProjection(state: ProjectionQueueState, workerId: string, now: number, leaseMs = 120_000) {
  for (const item of state.items) {
    if (item.status === "PROCESSING" && item.leaseExpiresAt !== null && item.leaseExpiresAt <= now) {
      item.status = item.attemptCount >= 5 ? "FAILED" : "RETRY";
      item.lockedBy = null;
      item.leaseExpiresAt = null;
      item.lastErrorCode = item.status === "FAILED" ? "RETRY_LIMIT_EXCEEDED" : "LEASE_EXPIRED";
    }
  }
  const item = state.items
    .filter((queued) => (queued.status === "PENDING" || queued.status === "RETRY") && queued.availableAt <= now && queued.attemptCount < 5)
    .sort((a, b) => a.availableAt - b.availableAt)[0];
  if (!item) return null;
  item.status = "PROCESSING";
  item.attemptCount += 1;
  item.lockedBy = workerId;
  item.leaseExpiresAt = now + leaseMs;
  return item;
}

function requireLease(item: ProjectionQueueItem, workerId: string) {
  if (item.status !== "PROCESSING" || item.lockedBy !== workerId) throw new Error("PROJECTION_LEASE_NOT_OWNED");
}

export function completeProjection(item: ProjectionQueueItem, workerId: string, current: { organizationId: string; canonicalPersonId: string | null }) {
  requireLease(item, workerId);
  if (current.organizationId !== item.organizationId) throw new Error("PROJECTION_SCOPE_DENIED");
  if (item.operationType !== "CLEANUP_SOURCE_MAPPING" && current.canonicalPersonId !== item.canonicalPersonId) throw new Error("CANONICAL_STATE_CHANGED");
  item.status = "COMPLETED";
  item.lockedBy = null;
  item.leaseExpiresAt = null;
  item.lastErrorCode = null;
}

export function failProjection(item: ProjectionQueueItem, workerId: string, errorCode: string, retryable: boolean, now: number) {
  requireLease(item, workerId);
  item.status = retryable && item.attemptCount < 5 ? "RETRY" : "FAILED";
  item.availableAt = item.status === "RETRY" ? now + Math.min(3_600_000, 60_000 * 2 ** Math.max(item.attemptCount - 1, 0)) : item.availableAt;
  item.lockedBy = null;
  item.leaseExpiresAt = null;
  item.lastErrorCode = errorCode;
}

export function retryProjection(item: ProjectionQueueItem) {
  if (item.status !== "FAILED" && item.status !== "RETRY") throw new Error("PROJECTION_RETRY_NOT_ALLOWED");
  item.status = "RETRY";
  item.attemptCount = 0;
  item.availableAt = 0;
  item.lastErrorCode = null;
}
