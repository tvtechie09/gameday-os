import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhone } from "../src/lib/services/sms.ts";

test("normalizePhone assumes US for 10 digits", () => {
  assert.equal(normalizePhone("555 123 4567"), "+15551234567");
  assert.equal(normalizePhone("(555) 123-4567"), "+15551234567");
});

test("normalizePhone keeps an explicit country code", () => {
  assert.equal(normalizePhone("+44 20 7946 0958"), "+442079460958");
  assert.equal(normalizePhone("1-555-123-4567"), "+15551234567");
});

test("normalizePhone rejects junk / too-short input", () => {
  assert.equal(normalizePhone(""), null);
  assert.equal(normalizePhone(null), null);
  assert.equal(normalizePhone("12345"), null);
});
