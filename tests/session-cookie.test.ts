import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeImpersonation,
  decodeSession,
  encodeImpersonation,
  encodeSession,
  type ImpersonationPayload,
  type SessionPayload,
} from "../src/lib/access/session-cookie.ts";

const SECRET = "test-secret-abcdefghijklmnop";

function withSecret(secret: string | undefined) {
  if (secret === undefined) {
    delete process.env.SESSION_COOKIE_SECRET;
  } else {
    process.env.SESSION_COOKIE_SECRET = secret;
  }
}

const adminSession: SessionPayload = {
  userId: "11111111-1111-4111-8111-111111111111",
  email: "admin@example.com",
  displayName: "Admin",
  roleKey: "super_admin",
  scopeType: "platform",
  scopeId: "00000000-0000-0000-0000-000000000000",
  venueId: null,
  venueName: null,
};

test("session cookie round-trips through sign + verify", async () => {
  withSecret(SECRET);
  const cookie = await encodeSession(adminSession);
  assert.match(cookie, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(await decodeSession(cookie), adminSession);
});

test("a tampered payload is rejected", async () => {
  withSecret(SECRET);
  const cookie = await encodeSession(adminSession);
  const [payload, signature] = cookie.split(".");
  // Flip the last char of the payload; signature no longer matches.
  const flipped = payload.slice(0, -1) + (payload.endsWith("A") ? "B" : "A");
  assert.equal(await decodeSession(`${flipped}.${signature}`), null);
});

test("a tampered signature is rejected", async () => {
  withSecret(SECRET);
  const cookie = await encodeSession(adminSession);
  const [payload, signature] = cookie.split(".");
  const flipped = signature.slice(0, -1) + (signature.endsWith("A") ? "B" : "A");
  assert.equal(await decodeSession(`${payload}.${flipped}`), null);
});

test("a cookie signed with a different secret is rejected", async () => {
  withSecret(SECRET);
  const cookie = await encodeSession(adminSession);
  withSecret("a-totally-different-secret-value");
  assert.equal(await decodeSession(cookie), null);
});

test("a legacy unsigned JSON cookie is rejected (the pre-signing forgery)", async () => {
  withSecret(SECRET);
  const forged = encodeURIComponent(JSON.stringify(adminSession));
  assert.equal(await decodeSession(forged), null);
});

test("impersonation cookie round-trips and rejects tampering", async () => {
  withSecret(SECRET);
  const selection: ImpersonationPayload = {
    venueId: "d15ce9df-4803-44a6-b838-f4eb853a104c",
    organizationId: null,
    roleKey: "venue_director",
    startedByUserId: adminSession.userId,
    startedAt: "2026-07-18T00:00:00.000Z",
  };
  const cookie = await encodeImpersonation(selection);
  assert.deepEqual(await decodeImpersonation(cookie), selection);

  const [payload, signature] = cookie.split(".");
  assert.equal(await decodeImpersonation(`${payload}x.${signature}`), null);
});

test("empty and malformed cookies decode to null", async () => {
  withSecret(SECRET);
  assert.equal(await decodeSession(undefined), null);
  assert.equal(await decodeSession(""), null);
  assert.equal(await decodeSession("no-dot-here"), null);
  assert.equal(await decodeSession(".onlysignature"), null);
});
