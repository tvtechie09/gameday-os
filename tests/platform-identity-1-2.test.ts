import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { describe } from "node:test";
import {
  claimProjection,
  completeProjection,
  enqueueProjection,
  failProjection,
  retryProjection,
  type ProjectionQueueState,
} from "../src/lib/platform-identity-projection.ts";
import { canReviewIdentityOrganization, explainIdentityReason, projectionStatusLabel } from "../src/lib/platform-identity-review.ts";

const migration = readFileSync(new URL("../supabase/migrations/20260904004035_platform_identity_1_2_review_projection.sql", import.meta.url), "utf8");
const roleCompatibilityMigration = readFileSync(new URL("../supabase/migrations/20260904005857_platform_identity_1_2_admin_role_compatibility.sql", import.meta.url), "utf8");
const projectionIndexMigration = readFileSync(new URL("../supabase/migrations/20260904010007_platform_identity_1_2_projection_fk_indexes.sql", import.meta.url), "utf8");
const service = readFileSync(new URL("../src/lib/services/platform-identity-review.ts", import.meta.url), "utf8");
const actions = readFileSync(new URL("../src/app/admin/identity/review/actions.ts", import.meta.url), "utf8");
const listPage = readFileSync(new URL("../src/app/admin/identity/review/page.tsx", import.meta.url), "utf8");
const detailPage = readFileSync(new URL("../src/app/admin/identity/review/[caseId]/page.tsx", import.meta.url), "utf8");
const navigation = readFileSync(new URL("../src/lib/access/navigation.ts", import.meta.url), "utf8");

function item(id = "q1") {
  return {
    id,
    organizationId: "org-a",
    canonicalPersonId: "person-a",
    sourceIdentityId: "source-a",
    operationType: "ENSURE_PERSON_MAPPING" as const,
    targetDomain: "team_family" as const,
    dedupeKey: "event-a:team_family:ensure",
    availableAt: 0,
  };
}

describe("Platform Identity 1.2 review", () => {
  test("uses a dedicated capability and exact organization scope", () => {
    assert.equal(canReviewIdentityOrganization({ active: true, permissions: ["identity.review"], scopeType: "organization", scopeId: "org-a", targetOrganizationId: "org-a" }), true);
    assert.equal(canReviewIdentityOrganization({ active: true, permissions: ["identity.review"], scopeType: "organization", scopeId: "org-a", targetOrganizationId: "org-b" }), false);
    assert.equal(canReviewIdentityOrganization({ active: true, permissions: ["identity.review"], scopeType: "platform", scopeId: "platform", targetOrganizationId: "org-b" }), true);
    assert.equal(canReviewIdentityOrganization({ active: true, permissions: ["identity.role.manage"], scopeType: "organization", scopeId: "org-a", targetOrganizationId: "org-a" }), false);
    for (const role of ["super_admin", "platform_admin", "organization_admin"]) assert.match(migration + roleCompatibilityMigration, new RegExp(role));
  });

  test("translates technical reasons into plain language", () => {
    assert.match(explainIdentityReason("AMBIGUOUS_IDENTIFIER"), /more than one person/i);
    assert.doesNotMatch(explainIdentityReason("CONFLICTING_STRONG_IDENTIFIERS"), /CONFLICTING_/);
  });

  test("keeps list search inside the review-case set and masks details", () => {
    assert.match(listPage, /Search this review queue/);
    assert.match(migration, /maskedValue/);
    assert.doesNotMatch(detailPage, /externalPersonId/);
  });

  test("requires server-produced candidates and optimistic case versions", () => {
    assert.match(migration, /p_candidate_person_id = any\(v_candidates\)/);
    assert.match(migration, /v_case\.review_version <> p_expected_version/);
    assert.match(migration, /IDENTITY_REVIEW_STALE/);
  });

  test("supports link, keep-separate, defer, and stale-safe actions", () => {
    for (const action of ["linkIdentityRecordsAction", "keepIdentitySeparateAction", "deferIdentityReviewAction"]) assert.match(actions, new RegExp(action));
    assert.match(migration, /review_status = 'rejected'/);
    assert.match(migration, /event_type[\s\S]*REVIEW_DEFERRED/);
    assert.match(migration, /keep_platform_identities_separate/);
    assert.match(migration, /confirm_platform_identity_match/);
  });

  test("records administrator actors and queues only downstream projection", () => {
    assert.match(migration, /'administrator'[\s\S]*p_actor_user_id/);
    assert.match(migration, /enqueue_platform_identity_projection/);
    assert.doesNotMatch(migration, /provider_payload/);
  });

  test("provides accessible, explicit confirmation language", () => {
    assert.match(detailPage, /Link these records\?/);
    assert.match(detailPage, /Keep these people separate\?/);
    assert.match(detailPage, /fieldset/);
    assert.match(detailPage, /aria-live/);
  });

  test("rechecks server authorization for every read and mutation", () => {
    assert.match(service, /requireIdentityReviewOrganization\(organizationId\)/);
    assert.match(service, /requireIdentityReviewOrganization\(input\.organizationId\)/);
    assert.match(service, /requireIdentityReviewOrganization\(organizationId\)/);
    assert.match(navigation, /prefix: "\/admin\/identity\/review", cap: canReviewIdentities/);
    assert.match(actions, /decideIdentityReviewCase/);
  });
});

describe("Platform Identity 1.2 projection queue", () => {
  test("deduplicates enqueue requests", () => {
    const state: ProjectionQueueState = { items: [] };
    assert.equal(enqueueProjection(state, item()).id, enqueueProjection(state, item("q2")).id);
    assert.equal(state.items.length, 1);
  });

  test("claims one item with a lease and blocks a concurrent claim", () => {
    const state: ProjectionQueueState = { items: [] };
    enqueueProjection(state, item());
    assert.equal(claimProjection(state, "worker-a", 1)?.lockedBy, "worker-a");
    assert.equal(claimProjection(state, "worker-b", 1), null);
  });

  test("completes idempotent work only against current canonical state", () => {
    const state: ProjectionQueueState = { items: [] };
    const queued = enqueueProjection(state, item());
    claimProjection(state, "worker-a", 1);
    assert.throws(() => completeProjection(queued, "worker-a", { organizationId: "org-b", canonicalPersonId: "person-a" }), /SCOPE_DENIED/);
    completeProjection(queued, "worker-a", { organizationId: "org-a", canonicalPersonId: "person-a" });
    assert.equal(queued.status, "COMPLETED");
  });

  test("rejects stale canonical person state before projection", () => {
    const state: ProjectionQueueState = { items: [] };
    const queued = enqueueProjection(state, item());
    claimProjection(state, "worker-a", 1);
    assert.throws(() => completeProjection(queued, "worker-a", { organizationId: "org-a", canonicalPersonId: "person-b" }), /CANONICAL_STATE_CHANGED/);
  });

  test("uses bounded retry and authorized reset semantics", () => {
    const state: ProjectionQueueState = { items: [] };
    const queued = enqueueProjection(state, item());
    claimProjection(state, "worker-a", 1);
    failProjection(queued, "worker-a", "TEMPORARY_PROJECTION_FAILURE", true, 1);
    assert.equal(queued.status, "RETRY");
    assert.ok(queued.availableAt > 1);
    queued.status = "FAILED";
    retryProjection(queued);
    assert.equal(queued.attemptCount, 0);
  });

  test("fails permanently after the bounded attempt limit", () => {
    const state: ProjectionQueueState = { items: [] };
    const queued = enqueueProjection(state, item());
    queued.attemptCount = 4;
    claimProjection(state, "worker-a", 1);
    failProjection(queued, "worker-a", "TEMPORARY_PROJECTION_FAILURE", true, 1);
    assert.equal(queued.status, "FAILED");
  });

  test("migration uses service-only RLS, skip-locked claiming, and stable dedupe", () => {
    assert.match(migration, /enable row level security/);
    assert.match(migration, /revoke all on table public\.platform_identity_projection_queue from public, anon, authenticated/);
    assert.match(migration, /for update skip locked/);
    assert.match(migration, /dedupe_key text not null unique/);
    assert.match(migration, /security invoker set search_path = ''/);
    assert.match(projectionIndexMigration, /\(canonical_person_id\)/);
    assert.match(projectionIndexMigration, /\(subject_person_id\)/);
  });

  test("worker refreshes canonical state and preserves Team and Family domain fields", () => {
    assert.match(migration, /person_source_identities s/);
    assert.match(migration, /platform_domain_person_projections/);
    assert.doesNotMatch(migration, /update public\.gdt_(people|players|guardian_relationships)/);
  });

  test("admin projection labels stay subtle", () => {
    assert.equal(projectionStatusLabel("COMPLETED"), "Applied");
    assert.equal(projectionStatusLabel("FAILED"), "Action needed");
    assert.match(detailPage, /Domain update/);
  });
});
