import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveActorUserId, seededOperatorUserId } from "../src/lib/services/actor.ts";

describe("resolveActorUserId", () => {
  it("returns the configured operator id when provided", () => {
    assert.equal(
      resolveActorUserId("11111111-1111-1111-1111-111111111111"),
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("trims surrounding whitespace from the configured operator id", () => {
    assert.equal(
      resolveActorUserId("  22222222-2222-2222-2222-222222222222  "),
      "22222222-2222-2222-2222-222222222222",
    );
  });

  it("falls back to the seeded platform-admin when null, undefined, or blank", () => {
    assert.equal(resolveActorUserId(null), seededOperatorUserId);
    assert.equal(resolveActorUserId(undefined), seededOperatorUserId);
    assert.equal(resolveActorUserId("   "), seededOperatorUserId);
  });
});
