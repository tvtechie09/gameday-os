import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isDevLoginEnabledForEnvironment } from "../src/lib/access/env.ts";
import { isPilotPreviewEnvironmentForEnvironment } from "../src/lib/pilot-build.ts";

const localDevelopment = {
  NEXT_PUBLIC_ENABLE_DEV_LOGIN: "true",
  NODE_ENV: "development",
  PILOT_PREVIEW: undefined,
  VERCEL_ENV: undefined,
};

test("explicit local development can enable dev-login", () => {
  assert.equal(isDevLoginEnabledForEnvironment(localDevelopment), true);
});

test("local development without explicit enablement denies dev-login", () => {
  assert.equal(isDevLoginEnabledForEnvironment({ ...localDevelopment, NEXT_PUBLIC_ENABLE_DEV_LOGIN: undefined }), false);
});

test("Pilot Preview denies contradictory public dev-login enablement", () => {
  assert.equal(isDevLoginEnabledForEnvironment({
    ...localDevelopment,
    PILOT_PREVIEW: "true",
    VERCEL_ENV: "preview",
  }), false);
});

test("Production denies contradictory public dev-login enablement", () => {
  assert.equal(isDevLoginEnabledForEnvironment({
    ...localDevelopment,
    NODE_ENV: "production",
    VERCEL_ENV: "production",
  }), false);
});

test("ambiguous Vercel-hosted environments fail closed", () => {
  assert.equal(isDevLoginEnabledForEnvironment({
    ...localDevelopment,
    VERCEL_ENV: "development",
  }), false);
});

test("Pilot classification is explicit and never branch-name dependent", () => {
  assert.equal(isPilotPreviewEnvironmentForEnvironment({ PILOT_PREVIEW: "true", VERCEL_ENV: "preview" }), true);
  assert.equal(isPilotPreviewEnvironmentForEnvironment({ PILOT_PREVIEW: undefined, VERCEL_ENV: "preview" }), false);
  assert.equal(isPilotPreviewEnvironmentForEnvironment({ PILOT_PREVIEW: "true", VERCEL_ENV: "production" }), false);
});

test("dev-login page and direct login API both enforce the server guard", () => {
  const page = readFileSync("src/app/dev-login/page.tsx", "utf8");
  const route = readFileSync("src/app/api/dev-login/login/route.ts", "utf8");
  assert.match(page, /if \(!isDevLoginEnabled\(\)\)[\s\S]*notFound\(\)/);
  assert.match(route, /if \(!isDevLoginEnabled\(\)\)[\s\S]*status: 403/);
});

test("normal hosted Supabase Auth remains independent from dev-login", () => {
  const proxy = readFileSync("src/proxy.ts", "utf8");
  const session = readFileSync("src/lib/access/session.ts", "utf8");
  assert.match(proxy, /supabase\.auth\.getUser\(\)/);
  assert.match(proxy, /resolveHostedActor\(authedUser/);
  assert.match(session, /const authUser = await getSupabaseAuthUser\(\)/);
  assert.match(session, /resolveHostedActor\(authUser/);
});
