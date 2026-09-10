import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildPrivacyImpact, privacyOperationDefinitions } from "../src/lib/privacy-lifecycle-core.ts";

const service = readFileSync("src/lib/services/privacy-controls.ts", "utf8");
const route = readFileSync("src/app/api/admin/privacy/export/route.ts", "utf8");
const page = readFileSync("src/app/admin/identity/privacy/page.tsx", "utf8");

const counts = { accounts: 1, identifiers: 2, sourceIdentities: 1, organizationLinks: 1, relationshipsAsSubject: 1, relationshipsAsRelated: 2, provenance: 3, legacyLinks: 1, domainMemberships: 4, projectionItems: 1, auditEvents: 9 };

test("privacy operations keep account, canonical person, provider unlink, and erasure distinct", () => {
  assert.deepEqual(Object.keys(privacyOperationDefinitions()), ["export", "deactivate", "erase", "providerUnlink", "accountDeletion"]);
  const impact = buildPrivacyImpact("person-a", "org-a", counts);
  assert.equal(impact.destructiveExecutionAllowed, false);
  assert(impact.blockers.includes("AUTH_ACCOUNT_SEPARATION_REQUIRED"));
  assert(impact.blockers.includes("PROVIDER_RESYNC_TOMBSTONE_POLICY_REQUIRED"));
});

test("child, guardian, audit, projection, and legacy dependencies are retained or blocked", () => {
  const impact = buildPrivacyImpact("child-a", "org-a", counts);
  assert(impact.blockers.includes("RELATIONSHIP_REVIEW_REQUIRED"));
  assert(impact.blockers.includes("DOMAIN_PROJECTION_CLEANUP_REQUIRED"));
  assert.equal(impact.retained.find((item) => item.recordClass.includes("other people's"))?.count, 2);
  assert.equal(impact.retained.find((item) => item.recordClass.includes("audit"))?.count, 9);
});

test("export is platform-admin-only, non-impersonated, and validates organization membership", () => {
  assert.match(service, /isPlatformAdmin\(ctx\)/);
  assert.match(service, /ctx\.isImpersonating/);
  assert.match(service, /Person is not linked to this organization/);
  assert.match(service, /eq\("organization_id", organizationId\)/);
  assert.match(page, /isPlatformAdmin\(ctx\)/);
});

test("machine-readable export excludes secrets and private evidence payloads", () => {
  assert.match(route, /private, no-store/);
  assert.match(route, /Content-Disposition/);
  assert.match(service, /authentication secrets/);
  assert.match(service, /provenance asserted values/);
  assert.doesNotMatch(service, /select\([^)]*verification_metadata|select\([^)]*asserted_value|select\([^)]*supporting_metadata/);
});

test("2.3A has no destructive route or UI action", () => {
  assert.match(page, /Erasure blocked/);
  assert.match(page, /destructiveExecutionAllowed/);
  assert.doesNotMatch(page, /Delete person|Erase now|Anonymize now/);
  assert.doesNotMatch(route, /export async function (POST|DELETE|PATCH)/);
});
