import assert from "node:assert/strict";
import test from "node:test";
import { isPlausibleTotpCode, needsMfaChallenge } from "../src/lib/access/mfa-core.ts";

test("needsMfaChallenge: aal1 -> aal2 requires a challenge", () => {
  assert.equal(needsMfaChallenge("aal1", "aal2"), true);
});

test("needsMfaChallenge: no enrolled factor means no challenge, ever", () => {
  // Both levels are aal1 when nothing is enrolled -- enrollment is what turns
  // this on, not a flag we could forget to check.
  assert.equal(needsMfaChallenge("aal1", "aal1"), false);
});

test("needsMfaChallenge: already at aal2 is not re-challenged", () => {
  assert.equal(needsMfaChallenge("aal2", "aal2"), false);
});

test("needsMfaChallenge: null levels never challenge", () => {
  assert.equal(needsMfaChallenge(null, "aal2"), false);
  assert.equal(needsMfaChallenge("aal1", null), false);
  assert.equal(needsMfaChallenge(null, null), false);
});

test("isPlausibleTotpCode accepts exactly six digits, trimmed", () => {
  assert.equal(isPlausibleTotpCode("123456"), true);
  assert.equal(isPlausibleTotpCode("  123456  "), true);
});

test("isPlausibleTotpCode rejects anything else", () => {
  assert.equal(isPlausibleTotpCode(""), false);
  assert.equal(isPlausibleTotpCode("12345"), false);
  assert.equal(isPlausibleTotpCode("1234567"), false);
  assert.equal(isPlausibleTotpCode("12a456"), false);
  assert.equal(isPlausibleTotpCode("ABCD-EFGH"), false);
});
