import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { evaluateEffectiveTruth, truthProviderLabel, truthReasonExplanations, type TruthAssertion, type TruthAuthorityRule } from "../src/lib/platform-identity-truth.ts";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const PERSON_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const migration = readFileSync(new URL("../supabase/migrations/20260904123639_platform_identity_1_3_gameday_truth.sql", import.meta.url), "utf8");
const emptyStateMigration = readFileSync(new URL("../supabase/migrations/20260904124708_platform_identity_1_3_truth_empty_state_fix.sql", import.meta.url), "utf8");
const service = readFileSync(new URL("../src/lib/services/platform-identity-truth.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/app/admin/identity/truth/[personId]/page.tsx", import.meta.url), "utf8");
const navigation = readFileSync(new URL("../src/lib/access/navigation.ts", import.meta.url), "utf8");

function assertion(id: string, provider: string, value: string, timestamp = "2026-09-04T12:00:00Z", overrides: Partial<TruthAssertion<string>> = {}): TruthAssertion<string> {
  return { id, organizationId: ORG_A, personId: PERSON_A, provider, value, timestamp, ...overrides };
}

function evaluate(assertions: TruthAssertion<string>[], rules: TruthAuthorityRule[] = []) {
  return evaluateEffectiveTruth({ organizationId: ORG_A, personId: PERSON_A, domain: "profile", key: "preferred_name", assertions, rules });
}

describe("GameDay Truth decisions", () => {
  it("selects one assertion with the matching explanation", () => {
    const result = evaluate([assertion("a", "sportsengine", "Charlie")]);
    assert.equal(result?.effective?.value, "Charlie");
    assert.equal(result?.reasonCode, "PLATFORM_DEFAULT");
    assert.equal(result?.explanation, truthReasonExplanations.PLATFORM_DEFAULT);
    assert.equal(result?.conflictState, "NO_CONFLICT");
  });

  it("recognizes multiple agreeing sources", () => {
    assert.equal(evaluate([assertion("a", "sportsengine", "Charlie"), assertion("b", "gamechanger", "Charlie")])?.conflictState, "AGREEING_SOURCES");
  });

  it("uses organization authority and does not let newer lower authority win", () => {
    const rules = [
      { organizationId: ORG_A, domain: "profile", key: "preferred_name", provider: "gamechanger", priority: 50 },
      { organizationId: ORG_A, domain: "profile", key: "preferred_name", provider: "sportsengine", priority: 10 },
    ];
    const result = evaluate([
      assertion("a", "sportsengine", "Charles", "2026-09-04T15:00:00Z"),
      assertion("b", "gamechanger", "Charlie", "2026-09-04T12:00:00Z"),
    ], rules);
    assert.equal(result?.effective?.value, "Charlie");
    assert.equal(result?.reasonCode, "ORG_AUTHORITY_RULE");
    assert.equal(result?.explanation, truthReasonExplanations.ORG_AUTHORITY_RULE);
  });

  it("uses platform authority when no organization rule exists", () => {
    const result = evaluate([assertion("a", "sportsengine", "Charles"), assertion("b", "gamechanger", "Charlie")], [
      { organizationId: null, domain: "profile", key: "preferred_name", provider: "gamechanger", priority: 20 },
    ]);
    assert.equal(result?.effective?.value, "Charlie");
    assert.equal(result?.reasonCode, "PLATFORM_AUTHORITY_RULE");
  });

  it("uses the uniquely newer value at equal authority", () => {
    const result = evaluate([
      assertion("a", "sportsengine", "Charles", "2026-09-03T12:00:00Z"),
      assertion("b", "gamechanger", "Charlie", "2026-09-04T12:00:00Z"),
    ]);
    assert.equal(result?.effective?.value, "Charlie");
    assert.equal(result?.reasonCode, "LATEST_EQUAL_AUTHORITY");
    assert.equal(result?.conflictState, "DIFFERENT_SOURCES");
  });

  it("returns explicit uncertainty for equally authoritative and equally recent disagreement", () => {
    const result = evaluate([assertion("a", "sportsengine", "Charles"), assertion("b", "gamechanger", "Charlie")]);
    assert.equal(result?.effective, null);
    assert.equal(result?.reasonCode, "EQUAL_AUTHORITY_CONFLICT");
    assert.equal(result?.conflictState, "UNRESOLVED_CONFLICT");
  });

  it("marks human resolution only when a field authority rule makes it win", () => {
    const result = evaluate([assertion("a", "sportsengine", "Chuck", "2026-09-05T12:00:00Z"), assertion("b", "gameday_account", "Charlie")], [
      { organizationId: ORG_A, domain: "profile", key: "preferred_name", provider: "gameday_account", priority: 100 },
    ]);
    assert.equal(result?.effective?.value, "Charlie");
    assert.equal(result?.conflictState, "HUMAN_RESOLVED");
  });

  it("excludes cross-organization, keep-separate/unlinked, and inactive source assertions", () => {
    const result = evaluate([
      assertion("valid", "sportsengine", "Charlie"),
      assertion("other-org", "gamechanger", "Wrong Org", undefined, { organizationId: "org-b" }),
      assertion("unlinked", "teamsnap", "Wrong Person", undefined, { personId: "person-b" }),
      assertion("inactive", "leagueapps", "Inactive", undefined, { sourceStatus: "inactive" }),
      assertion("stale", "csv", "Old", undefined, { status: "stale" }),
    ]);
    assert.equal(result?.effective?.value, "Charlie");
    assert.equal(result?.assertions.length, 1);
  });
});

describe("GameDay Truth contract", () => {
  it("normalizes provider labels without leaking tenant identifiers", () => {
    assert.equal(truthProviderLabel("sportsengine"), "SportsEngine");
    assert.equal(truthProviderLabel("studio_director"), "Studio Director");
    assert.doesNotMatch(page, /providerConnectionKey|externalPersonId/);
  });

  it("uses one bounded service-only summary RPC", () => {
    assert.match(service, /requireIdentityReviewOrganization\(organizationId\)/);
    assert.match(service, /get_platform_person_truth_summary/);
    assert.match(migration, /p_history_limit integer default 5/);
    assert.match(migration, /least\(coalesce\(p_history_limit, 5\), 10\)/);
    assert.match(migration, /revoke all on function public\.get_platform_person_truth_summary[\s\S]*public, anon, authenticated/);
    assert.match(migration, /grant execute on function public\.get_platform_person_truth_summary[\s\S]*service_role/);
    assert.match(migration, /security invoker set search_path = ''/);
    assert.match(emptyStateMigration, /jsonb_set\(value, '\{fields\}', coalesce\(value->'fields', '\[\]'::jsonb\), true\)/);
    assert.match(emptyStateMigration, /security invoker set search_path = ''/);
  });

  it("requires active exact organization and source scope", () => {
    assert.match(migration, /pol\.organization_id = p_organization_id and pol\.status = 'active'/);
    assert.match(migration, /psi\.organization_id = p_organization_id[\s\S]*psi\.person_id = p_person_id[\s\S]*psi\.status = 'active'/);
    assert.match(navigation, /prefix: "\/admin\/identity\/truth", cap: canReviewIdentities/);
  });

  it("keeps review, relationship, and projection state separate", () => {
    assert.match(migration, /'relationships'/);
    assert.match(migration, /'projectionItems'/);
    assert.match(migration, /'reviewCases'/);
    assert.match(page, /Delivery status is separate from canonical Truth/);
    assert.match(page, /Identity needs review/);
    assert.match(page, /Different relationship types were reported and remain separate/);
  });

  it("uses accessible cards and progressive disclosure", () => {
    assert.match(page, /<main/);
    assert.match(page, /<h1/);
    assert.match(page, /<details/);
    assert.match(page, /<summary/);
    assert.match(page, /aria-live/);
    assert.doesNotMatch(page, /<table/);
  });
});
