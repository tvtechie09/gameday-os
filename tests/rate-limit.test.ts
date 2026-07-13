import assert from "node:assert/strict";
import test from "node:test";
import { rateLimit, isBlocked, recordFailure, clientIp } from "../src/lib/rate-limit.ts";

test("rateLimit allows up to the limit then blocks within the window", () => {
  const key = "test:" + Math.random();
  for (let i = 0; i < 3; i += 1) {
    assert.equal(rateLimit(key, 3, 60_000).ok, true);
  }
  const blocked = rateLimit(key, 3, 60_000);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfter > 0);
});

test("rateLimit resets after the window elapses", () => {
  const key = "test-window:" + Math.random();
  assert.equal(rateLimit(key, 1, 1).ok, true);
  assert.equal(rateLimit(key, 1, 1).ok, false);
  const start = Date.now();
  while (Date.now() - start < 5) { /* spin past the 1ms window */ }
  assert.equal(rateLimit(key, 1, 1).ok, true);
});

test("failure-only limiter: checks without counting, blocks after recorded failures", () => {
  const key = "fail:" + Math.random();
  // Checking never increments — a legit success path is unaffected.
  for (let i = 0; i < 100; i += 1) assert.equal(isBlocked(key).blocked, false);
  // Record failures up to the limit.
  for (let i = 0; i < 5; i += 1) recordFailure(key, 5, 60_000);
  const result = isBlocked(key);
  assert.equal(result.blocked, true);
  assert.ok(result.retryAfter > 0);
});

test("clientIp reads the first x-forwarded-for hop", () => {
  const request = new Request("https://x.test", { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } });
  assert.equal(clientIp(request), "203.0.113.7");
  assert.equal(clientIp(new Request("https://x.test")), "unknown");
});
