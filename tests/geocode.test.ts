import assert from "node:assert/strict";
import test from "node:test";
import { cleanCityStateQuery } from "../src/lib/services/geocode.ts";

test("drops the street line and dedupes repeated tokens, appends US", () => {
  // The exact garbled query the weather form produced for Wintrust.
  const out = cleanCityStateQuery("520 Cedar Crossings Dr, New Lenox, IL 60451, New Lenox, IL");
  assert.ok(!out.includes("520 Cedar"), "street line dropped");
  assert.ok(out.includes("New Lenox"), "city kept");
  assert.equal((out.match(/New Lenox/g) || []).length, 1, "deduped");
  assert.ok(out.endsWith(",US"), "country appended");
});

test("does not double-append a country that's already present", () => {
  assert.equal(cleanCityStateQuery("Chicago, IL, US"), "Chicago,IL,US");
});

test("empty / street-only input yields empty string", () => {
  assert.equal(cleanCityStateQuery(""), "");
  assert.equal(cleanCityStateQuery("123 Main St"), "");
});
