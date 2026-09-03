import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildContentSecurityPolicy } from "../next.config.ts";

const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const adminLayout = readFileSync(new URL("../src/app/admin/layout.tsx", import.meta.url), "utf8");
const apiRequest = readFileSync(new URL("../src/lib/api-request.ts", import.meta.url), "utf8");
const publicWriteRoutes = ["field-page-views", "follows", "sponsor-analytics/clicks", "sponsor-analytics/impressions", "resource-activations"].map((route) => readFileSync(new URL(`../src/app/api/${route}/route.ts`, import.meta.url), "utf8"));
const liveReadRoutes = ["display/venue/[venueId]", "scoreboard/field/[fieldId]", "scoreboard/session/[sessionId]", "venues/[venueId]/mode", "weather/venue/[venueId]"].map((route) => readFileSync(new URL(`../src/app/api/${route}/route.ts`, import.meta.url), "utf8"));
const proxy = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
const serverAuth = readFileSync(new URL("../src/lib/supabase/server-auth.ts", import.meta.url), "utf8");
const protectedAdminRoutes = [
  "automations/route.ts",
  "automations/[id]/route.ts",
  "automations/[id]/disable/route.ts",
  "automations/[id]/enable/route.ts",
  "automations/[id]/logs/route.ts",
  "automations/[id]/run/route.ts",
  "automations/templates/route.ts",
  "automations/templates/[templateKey]/install/route.ts",
  "integrations/route.ts",
  "integrations/[provider]/_shared.ts",
  "integrations/sportsengine/_shared.ts",
].map((route) => readFileSync(new URL(`../src/app/api/admin/${route}`, import.meta.url), "utf8"));

test("Venue OS ships browser hardening headers", () => {
  for (const header of ["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options"]) {
    assert.match(nextConfig, new RegExp(header));
  }
});

test("development hot reload does not weaken the production content security policy", () => {
  assert.match(buildContentSecurityPolicy("development"), /'unsafe-eval'/);
  assert.doesNotMatch(buildContentSecurityPolicy("production"), /'unsafe-eval'/);
  assert.match(nextConfig, /allowedDevOrigins: \["127\.0\.0\.1"\]/);
});

test("Venue OS has deterministic ESM and type-validation gates", () => {
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.scripts.typecheck, "tsc --noEmit");
});

test("Venue OS pins the patched PostCSS security line", () => {
  assert.equal(packageJson.overrides.postcss, "^8.5.10");
});

test("admin layout delegates to the capability-filtered AppFrame", () => {
  assert.match(adminLayout, /AppFrame/);
});

test("known missing admin Supabase configuration degrades reads instead of failing pages", () => {
  const fieldPageViews = readFileSync(new URL("../src/lib/services/field-page-views.ts", import.meta.url), "utf8");
  const follows = readFileSync(new URL("../src/lib/services/follows.ts", import.meta.url), "utf8");
  for (const source of [fieldPageViews, follows]) {
    assert.match(source, /try \{\s*supabase = getSupabaseAdminClient\(\);\s*\} catch \{\s*return \[\];\s*\}/);
  }
});

test("public writes have bounded deterministic JSON parsing", () => {
  assert.match(apiRequest, /maxBytes = 64 \* 1024/);
  assert.match(apiRequest, /request\.headers\.get\("content-length"\)/);
  assert.match(apiRequest, /new TextEncoder\(\)\.encode\(raw\)\.byteLength/);
  assert.match(apiRequest, /Request body must be valid JSON/);
  assert.match(apiRequest, /Request body must be a JSON object/);
  assert.match(apiRequest, /Enter a valid email address/);
  assert.match(apiRequest, /Resource URL must use HTTP or HTTPS/);
});

test("all public write routes use the shared request guard", () => {
  for (const route of publicWriteRoutes) {
    assert.match(route, /parseJsonObject/);
    assert.match(route, /error instanceof ApiRequestError/);
  }
});

test("live operational reads explicitly prevent stale intermediary caching", () => {
  for (const route of liveReadRoutes) assert.match(route, /"cache-control": "no-store"/);
});

test("admin routes require a verified Supabase session", () => {
  assert.match(proxy, /export async function proxy/);
  assert.match(proxy, /auth\.getUser\(\)/);
  assert.match(serverAuth, /supabase\.auth\.getUser\(\)/);
  assert.match(serverAuth, /eq\("auth_user_id", data\.user\.id\)/);
  assert.match(serverAuth, /user_status.*active/);
  for (const route of protectedAdminRoutes) {
    assert.match(route, /getVerifiedVenueActorId|VenueAuthError/);
    assert.doesNotMatch(route, /x-gameday-actor-user-id/);
    assert.doesNotMatch(route, /searchParams\.get\("actorUserId"\)/);
  }
});
