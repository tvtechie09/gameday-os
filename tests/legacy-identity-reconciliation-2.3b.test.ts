import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classifyLegacyPerson, maskLegacyIdentifier, previewIsCurrent, summarizeLegacyDecisions, type LegacyPersonInput } from "../src/lib/legacy-identity-reconciliation-core.ts";

const service = readFileSync("src/lib/services/legacy-identity-reconciliation.ts", "utf8");
const route = readFileSync("src/app/api/admin/identity/reconciliation/preview/route.ts", "utf8");
const page = readFileSync("src/app/admin/identity/reconciliation/page.tsx", "utf8");
const schema = JSON.parse(readFileSync("docs/legacy-identity-reconciliation-manifest.schema.json", "utf8"));
const person: LegacyPersonInput = { legacyPersonId: "legacy-a", stateId: "state-a", source: "local", sourceKey: "state-a:legacy-a", email: "parent@example.com", phone: "5551112222", updatedAt: "2026-09-10T10:00:00Z" };

test("all conservative classifications are reachable", () => {
  const cases = [
    classifyLegacyPerson({ ...person, synthetic: true }, { organizationId: "org-a" }),
    classifyLegacyPerson(person, { organizationId: null }),
    classifyLegacyPerson(person, { organizationId: "org-a", existingCanonicalPersonId: "p-1" }),
    classifyLegacyPerson({ ...person, source: "csv", sourceKey: null }, { organizationId: "org-a" }),
    classifyLegacyPerson(person, { organizationId: "org-a", conflictingCanonicalPersonIds: ["p-1", "p-2"] }),
    classifyLegacyPerson(person, { organizationId: "org-a", durableSourceCanonicalPersonId: "p-1" }),
    classifyLegacyPerson(person, { organizationId: "org-a", possibleCanonicalPersonIds: ["p-1"] }),
    classifyLegacyPerson(person, { organizationId: "org-a" }),
  ];
  assert.deepEqual(Object.values(summarizeLegacyDecisions(cases)), [1, 1, 1, 1, 1, 1, 1, 1]);
});

test("names never participate and unverified identifiers only produce review", () => {
  const decision = classifyLegacyPerson(person, { organizationId: "org-a", possibleCanonicalPersonIds: ["p-name-or-email"] });
  assert.equal(decision.classification, "POSSIBLE_MATCH");
  assert.equal(decision.reasonCode, "UNVERIFIED_IDENTIFIER_REVIEW_REQUIRED");
  assert(!JSON.stringify(decision).includes("parent@example.com"));
});

test("keep-separate prevents a candidate from returning and relationships stay separate", () => {
  const decision = classifyLegacyPerson(person, { organizationId: "org-a", possibleCanonicalPersonIds: ["p-1"], separatedCanonicalPersonIds: ["p-1"], relationshipCount: 3 });
  assert.equal(decision.classification, "DISTINCT_NEW_PERSON");
  assert.equal(decision.relationshipProjectionCount, 3);
  assert.equal(decision.reasonCode, "CANDIDATES_EXPLICITLY_SEPARATED");
});

test("fingerprints detect drift and remain stable for identical evidence", () => {
  const evidence = { organizationId: "org-a", possibleCanonicalPersonIds: ["p-1"] };
  const decision = classifyLegacyPerson(person, evidence);
  assert.equal(previewIsCurrent(decision, person, evidence), true);
  assert.equal(previewIsCurrent(decision, { ...person, updatedAt: "2026-09-10T10:01:00Z" }, evidence), false);
  assert.equal(classifyLegacyPerson(person, evidence).fingerprint, decision.fingerprint);
});

test("identifiers are masked and manifest cannot enable execution", () => {
  assert.equal(maskLegacyIdentifier("parent@example.com"), "p***@example.com");
  assert.equal(maskLegacyIdentifier("(555) 111-2222"), "***-***-2222");
  assert.deepEqual(schema.properties.executionEnabled, { const: false });
  assert.match(page, /Execution is disabled/);
  assert.doesNotMatch(page, /Apply All|Merge all|Execute migration/i);
});

test("preview is bounded, platform-only, cross-org mapped, and mutation-free", () => {
  assert.match(service, /isPlatformAdmin\(ctx\)/);
  assert.match(service, /ctx\.isImpersonating/);
  assert.match(service, /Math\.min\(pageSize, 100\)/);
  assert.match(service, /platform_organization_legacy_mappings/);
  assert.match(service, /legacy_namespace", "state_id"/);
  assert.doesNotMatch(service, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
  assert.doesNotMatch(route, /export async function (POST|PATCH|DELETE)/);
  assert.match(route, /private, no-store/);
});
