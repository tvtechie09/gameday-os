import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { describe } from "node:test";
import {
  claimProjection,
  completeProjection,
  enqueueProjection,
  failProjection,
  type ProjectionQueueItem,
  type ProjectionQueueState,
} from "../src/lib/platform-identity-projection.ts";

const migration = readFileSync(
  new URL("../supabase/migrations/20260910222026_durable_identity_projection_scheduler.sql", import.meta.url),
  "utf8",
);
const retryMigration = readFileSync(
  new URL("../supabase/migrations/20260910222658_identity_projection_retry_classification.sql", import.meta.url),
  "utf8",
);

function item(overrides: Partial<ProjectionQueueItem> = {}): Omit<ProjectionQueueItem, "status" | "attemptCount" | "lockedBy" | "leaseExpiresAt" | "lastErrorCode"> {
  return {
    id: "queue-a",
    organizationId: "org-a",
    canonicalPersonId: "person-a",
    sourceIdentityId: "source-a",
    operationType: "ENSURE_PERSON_MAPPING",
    targetDomain: "team_family",
    dedupeKey: "event-a:team_family:ensure",
    availableAt: 0,
    ...overrides,
  };
}

describe("database-native identity projection scheduler", () => {
  test("installs one database Cron without a network worker", () => {
    assert.match(migration, /create extension if not exists pg_cron with schema pg_catalog/);
    assert.match(migration, /cron\.schedule\(\s*'gameday-identity-projection-worker'/);
    assert.match(migration, /'\* \* \* \* \*'/);
    assert.doesNotMatch(migration, /pg_net|net\.http|edge function/i);
  });

  test("uses one bounded canonical worker entry point", () => {
    assert.match(migration, /run_platform_identity_projection_worker\(\s*p_batch_size integer default 10/);
    assert.match(migration, /p_batch_size not between 1 and 25/);
    assert.match(migration, /claim_platform_identity_projection\(v_worker_id, 120\)/);
    assert.match(migration, /apply_platform_identity_projection\(v_queue_id, v_worker_id\)/);
    assert.match(migration, /fail_platform_identity_projection/);
  });

  test("treats a missing legacy mapping as bounded recoverable work", () => {
    assert.match(retryMigration, /LEGACY_MAPPING_REQUIRED/);
    assert.match(retryMigration, /v_error_code in \([\s\S]*'LEGACY_MAPPING_REQUIRED'/);
    assert.match(retryMigration, /fail_platform_identity_projection/);
    assert.doesNotMatch(retryMigration, /attempt_count\s*=\s*0/);
  });

  test("keeps worker and health execution away from browser roles", () => {
    assert.match(migration, /revoke all on function public\.run_platform_identity_projection_worker[\s\S]*from public, anon, authenticated/);
    assert.match(migration, /revoke all on function public\.get_platform_identity_projection_health[\s\S]*from public, anon, authenticated/);
    assert.match(migration, /security invoker/);
    assert.doesNotMatch(migration, /grant execute[\s\S]*to anon|grant execute[\s\S]*to authenticated/);
  });

  test("records aggregate worker and queue health without identity payloads", () => {
    assert.match(migration, /platform_identity_projection_worker_runs/);
    for (const field of [
      "pendingCount", "oldestPendingAgeSeconds", "retryCount", "failedCount",
      "staleProcessingCount", "lastSuccessfulWorkerRunAt",
    ]) assert.match(migration, new RegExp(field));
    assert.doesNotMatch(migration, /email|phone|display_name|source_metadata/);
  });

  test("returns an empty bounded result when no work is eligible", () => {
    const state: ProjectionQueueState = { items: [] };
    assert.equal(claimProjection(state, "cron-a", 1), null);
  });

  test("honors retry availability and recovers stale leases", () => {
    const state: ProjectionQueueState = { items: [] };
    const queued = enqueueProjection(state, item());
    claimProjection(state, "cron-a", 1, 100);
    failProjection(queued, "cron-a", "TEMPORARY_PROJECTION_FAILURE", true, 2);
    assert.equal(claimProjection(state, "cron-b", queued.availableAt - 1), null);
    assert.equal(claimProjection(state, "cron-b", queued.availableAt)?.lockedBy, "cron-b");

    const staleState: ProjectionQueueState = { items: [] };
    const stale = enqueueProjection(staleState, item({ id: "queue-stale", dedupeKey: "stale" }));
    claimProjection(staleState, "cron-a", 1, 100);
    assert.equal(claimProjection(staleState, "cron-b", 102)?.id, stale.id);
    assert.equal(stale.lastErrorCode, "LEASE_EXPIRED");
  });

  test("deduplicates, prevents concurrent ownership, and fails cross-org apply", () => {
    const state: ProjectionQueueState = { items: [] };
    const queued = enqueueProjection(state, item());
    assert.equal(enqueueProjection(state, item({ id: "duplicate" })).id, queued.id);
    assert.equal(claimProjection(state, "cron-a", 1)?.id, queued.id);
    assert.equal(claimProjection(state, "cron-b", 1), null);
    assert.throws(
      () => completeProjection(queued, "cron-a", { organizationId: "org-b", canonicalPersonId: "person-a" }),
      /SCOPE_DENIED/,
    );
  });

  test("keeps idempotent final state and bounded terminal retry behavior", () => {
    const state: ProjectionQueueState = { items: [] };
    const queued = enqueueProjection(state, item());
    queued.attemptCount = 4;
    claimProjection(state, "cron-a", 1);
    failProjection(queued, "cron-a", "TEMPORARY_PROJECTION_FAILURE", true, 1);
    assert.equal(queued.status, "FAILED");

    const replay = enqueueProjection(state, item({ id: "replay" }));
    assert.equal(replay.id, queued.id);
    assert.equal(state.items.length, 1);
  });
});
