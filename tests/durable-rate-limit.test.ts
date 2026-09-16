import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("src/app/api/score/[token]/route.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260829021710_durable_public_rate_limits.sql", "utf8");

test("scorekeeper PIN failures use a durable atomic limiter", () => {
  assert.match(route, /checkDurableFailureLimit/);
  assert.match(route, /durableLimitKey\("score-token", token\)/);
  assert.match(route, /durableLimitKey\("score-ip", ip\)/);
  assert.match(route, /checkDurableFailureLimit\(durableTokenKey, 10, 60, true\)/);
  assert.match(migration, /on conflict \(bucket_key\) do update/);
  assert.match(migration, /security definer/);
  assert.match(migration, /grant execute .* to service_role/);
  assert.match(migration, /revoke all .* from public, anon, authenticated/);
});
