import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildAccessContext, type AccessContext } from "../src/lib/access/capabilities.ts";
import { getCoachMatch, getNlsaScenario, nlsaDemo } from "../src/lib/demo/nlsa.ts";
import {
  canAccessNlsaExperience,
  NLSA_FAMILY_ID,
  NLSA_ORGANIZATION_ID,
  NLSA_TEAM_ID,
  nlsaExperienceForPath,
} from "../src/lib/demo/nlsa-access.ts";
import { getRoleHome } from "../src/lib/access/navigation.ts";

const identities = {
  owner: { roleKey: "organization_admin", scopeType: "organization", scopeId: NLSA_ORGANIZATION_ID, permissions: ["league.manage"] },
  staff: { roleKey: "league_staff", scopeType: "organization", scopeId: NLSA_ORGANIZATION_ID, permissions: ["league.schedule.manage"] },
  coach: { roleKey: "coach", scopeType: "team", scopeId: NLSA_TEAM_ID, permissions: ["team.manage"] },
  family: { roleKey: "parent", scopeType: "family", scopeId: NLSA_FAMILY_ID, permissions: ["family.child.view"] },
} as const;

function actor(key: keyof typeof identities): AccessContext {
  const identity = identities[key];
  return buildAccessContext({
    userId: `nlsa-${key}`,
    email: `${key}@nlsa.test`,
    displayName: key,
    roleKey: identity.roleKey,
    scopeType: identity.scopeType,
    scopeId: identity.scopeId,
    venueId: null,
    venueName: "NLSA Demo",
    permissions: identity.permissions,
  });
}

test("NLSA routes are private and map to one explicit experience", () => {
  const middleware = readFileSync(new URL("../src/middleware.ts", import.meta.url), "utf8");
  const authMiddleware = readFileSync(new URL("../src/lib/supabase/auth-middleware.ts", import.meta.url), "utf8");
  const authServer = readFileSync(new URL("../src/lib/supabase/auth-server.ts", import.meta.url), "utf8");
  assert.match(middleware, /pathname === "\/demo\/nlsa"/);
  assert.match(middleware, /return false/);
  assert.match(middleware, /auth\.getUser\(\)/);
  assert.match(middleware, /const response = getResponse\(\)/);
  assert.match(authMiddleware, /getResponse: \(\) => response/);
  assert.match(middleware, /Cache-Control", "private, no-store"/);
  assert.match(authMiddleware, /setAll\(cookiesToSet, headersToSet\)/);
  assert.doesNotMatch(authMiddleware, /encode: "tokens-only"/);
  assert.doesNotMatch(authMiddleware, /value\.length > 0 && options\.maxAge !== 0/);
  assert.match(authMiddleware, /for \(const \{ name, value \} of cookiesToSet\)/);
  assert.match(authMiddleware, /Object\.entries\(headersToSet\)/);
  assert.match(authServer, /auth\.getUser\(\)/);
  assert.doesNotMatch(authServer, /encode: "tokens-only"/);
  assert.doesNotMatch(authServer, /auth\.getClaims\(\)/);
  assert.doesNotMatch(authServer, /cookieStore\.set\(/);
  assert.equal(nlsaExperienceForPath("/demo/nlsa/today"), "owner");
  assert.equal(nlsaExperienceForPath("/demo/nlsa/operations"), "operations");
  assert.equal(nlsaExperienceForPath("/demo/nlsa/coach"), "coach");
  assert.equal(nlsaExperienceForPath("/demo/nlsa/family"), "family");
});

test("dev-login preserves a safe NLSA deep link and redirects after POST as GET", () => {
  const route = readFileSync(new URL("../src/app/api/dev-login/login/route.ts", import.meta.url), "utf8");
  assert.match(route, /requestedNext\.startsWith\("\/"\)/);
  assert.match(route, /!requestedNext\.startsWith\("\/\/"\)/);
  assert.match(route, /NextResponse\.redirect\(new URL\(safeNext, request\.url\), 303\)/);
});

test("normal login uses the patched Supabase browser cookie flow", () => {
  const form = readFileSync(new URL("../src/components/auth/login-form.tsx", import.meta.url), "utf8");
  assert.match(form, /getSupabaseAuthBrowserClient\(\)/);
  assert.match(form, /signInWithPassword\(\{ email, password \}\)/);
  assert.doesNotMatch(readFileSync(new URL("../src/middleware.ts", import.meta.url), "utf8"), /pathname === "\/api\/auth\/login"/);
});

test("NLSA role matrix allows only the intended positive paths", () => {
  const owner = actor("owner");
  const staff = actor("staff");
  const coach = actor("coach");
  const family = actor("family");
  assert.equal(canAccessNlsaExperience(owner, "owner"), true);
  assert.equal(canAccessNlsaExperience(owner, "operations"), true);
  assert.equal(canAccessNlsaExperience(staff, "operations"), true);
  assert.equal(canAccessNlsaExperience(coach, "coach"), true);
  assert.equal(canAccessNlsaExperience(family, "family"), true);

  assert.equal(canAccessNlsaExperience(staff, "owner"), false);
  assert.equal(canAccessNlsaExperience(coach, "owner"), false);
  assert.equal(canAccessNlsaExperience(coach, "operations"), false);
  assert.equal(canAccessNlsaExperience(family, "coach"), false);
  assert.equal(canAccessNlsaExperience(family, "operations"), false);
});

test("cross-tenant and platform actors cannot enter the NLSA demo", () => {
  const owner = actor("owner");
  const otherTenant = { ...owner, scopeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
  const platform = { ...owner, roleKey: "platform_admin", scopeType: "platform" };
  for (const experience of ["owner", "operations", "coach", "family"] as const) {
    assert.equal(canAccessNlsaExperience(otherTenant, experience), false);
    assert.equal(canAccessNlsaExperience(platform, experience), false);
  }
});

test("NLSA identities land inside their least-privilege experience", () => {
  assert.equal(getRoleHome(actor("owner")), "/demo/nlsa/today");
  assert.equal(getRoleHome(actor("staff")), "/demo/nlsa/operations");
  assert.equal(getRoleHome(actor("coach")), "/demo/nlsa/coach");
  assert.equal(getRoleHome(actor("family")), "/demo/nlsa/family");
  const admin = readFileSync(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");
  assert.match(admin, /canAccessAdminWorkspace/);
  assert.match(admin, /redirect\(getRoleHome\(ctx\)\)/);
});

test("the disruption scenario is deterministic, scoped, and reversible by URL", () => {
  const normal = getNlsaScenario(undefined);
  const disrupted = getNlsaScenario("lightning");
  const recovered = getNlsaScenario("recovery");
  assert.equal(normal.key, "normal");
  assert.equal(normal.pitches.every((pitch) => pitch.state === "OPEN"), true);
  assert.equal(disrupted.pitches.filter((pitch) => pitch.state === "HOLD").length, 2);
  assert.equal(getCoachMatch(disrupted).originalPitch, "Pitch 3");
  assert.equal(getCoachMatch(disrupted).pitch, "Pitch 5");
  assert.equal(disrupted.matches.filter((match) => match.state === "DELAYED").length, 2);
  assert.equal(recovered.pitches.every((pitch) => pitch.state !== "HOLD"), true);
  assert.equal(getCoachMatch(recovered).pitch, "Pitch 5");
  assert.deepEqual(getNlsaScenario(undefined), normal, "normal reset must be reproducible");
});

test("customer-facing NLSA copy is soccer-native and honestly labels the provider boundary", () => {
  const fixture = JSON.stringify(nlsaDemo) + JSON.stringify(getNlsaScenario("lightning"));
  const component = readFileSync(new URL("../src/components/nlsa/nlsa-demo.tsx", import.meta.url), "utf8");
  const customerCopy = `${fixture}\n${component}`.toLowerCase();
  for (const term of ["innings", "dugouts", "diamonds", "batting order", "bullpen", "pitch count", "bases", "home plate"]) {
    assert.doesNotMatch(customerCopy, new RegExp(`\\b${term}\\b`), `unexpected baseball term: ${term}`);
  }
  assert.match(customerCopy, /sprocketsports/);
  assert.match(customerCopy, /no live connection/);
  assert.match(customerCopy, /synthetic/);
  assert.match(customerCopy, /nurve sports operations/);
  assert.doesNotMatch(customerCopy, /gameday os/);
});

test("all NLSA pages repeat the server-side authorization guard", () => {
  for (const route of ["today", "operations", "coach", "family"]) {
    const source = readFileSync(new URL(`../src/app/demo/nlsa/${route}/page.tsx`, import.meta.url), "utf8");
    assert.match(source, /getSessionContext/);
    assert.match(source, /canAccessNlsaExperience/);
    assert.match(source, /redirect\("\/no-access"\)/);
  }
});

test("the shared public header stays out of the customer-facing NLSA experience", () => {
  const header = readFileSync(new URL("../src/components/site-header.tsx", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../src/app/demo/nlsa/layout.tsx", import.meta.url), "utf8");
  assert.match(header, /pathname\.startsWith\("\/demo\/nlsa"\)/);
  assert.match(layout, /title: "NLSA Operations Demo"/);
});

test("NLSA staging migrations are additive, auth-safe, and explicitly synthetic", () => {
  const roles = readFileSync(new URL("../supabase/migrations/20260915010000_nlsa_experience_roles.sql", import.meta.url), "utf8");
  const seed = readFileSync(new URL("../supabase/migrations/20260915010100_nlsa_soccer_demo_seed.sql", import.meta.url), "utf8");
  assert.match(roles, /on conflict \(role_id, permission_id\) do nothing/);
  assert.doesNotMatch(roles, /\b(delete|truncate|drop)\b/i);
  assert.match(seed, /is_demo[\s\S]*true/i);
  assert.match(seed, /Synthetic private soccer operations demo/);
  assert.match(seed, /auth_user_id[\s\S]*null/i);
  assert.doesNotMatch(seed, /(?:insert into|update)\s+auth\.users/i);
  assert.doesNotMatch(seed, /encrypted_password|(?:insert into|update)\s+auth\.users/i);
  assert.doesNotMatch(seed, /\b(delete|truncate|drop)\b/i);
});
