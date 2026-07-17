import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFieldNames,
  slugify,
  tierForFieldCount,
  validateProvisionInput,
  type ProvisionInput,
} from "../src/lib/services/provisioning-core.ts";

const input = (over: Partial<ProvisionInput> = {}): ProvisionInput => ({
  organizationName: "Riverside Parks District",
  venueName: "Riverside Sports Complex",
  fieldCount: 8,
  fieldNamePattern: "Field {n}",
  sportType: "baseball",
  plan: null,
  ...over,
});

test("slugify makes a URL-safe org slug", () => {
  assert.equal(slugify("Riverside Parks District"), "riverside-parks-district");
  assert.equal(slugify("  O'Fallon Parks & Rec!  "), "ofallon-parks-rec");
  assert.equal(slugify("!!!"), "");
});

test("buildFieldNames substitutes {n} and clamps the count", () => {
  assert.deepEqual(buildFieldNames(3, "Field {n}"), ["Field 1", "Field 2", "Field 3"]);
  assert.deepEqual(buildFieldNames(2, "Diamond {n}"), ["Diamond 1", "Diamond 2"]);
  assert.equal(buildFieldNames(0, "Field {n}").length, 0);
  assert.equal(buildFieldNames(999, "Field {n}").length, 60); // clamped
});

test("buildFieldNames still yields distinct names when {n} is omitted", () => {
  // A careless pattern must not create three fields all named the same thing.
  assert.deepEqual(buildFieldNames(3, "North Diamond"), ["North Diamond 1", "North Diamond 2", "North Diamond 3"]);
  const names = buildFieldNames(5, "");
  assert.equal(new Set(names).size, 5);
});

test("validation accepts a good venue and rejects the bad cases", () => {
  assert.deepEqual(validateProvisionInput(input()), { ok: true });

  assert.match((validateProvisionInput(input({ organizationName: " " })) as { error: string }).error, /Organization name/i);
  assert.match((validateProvisionInput(input({ venueName: "" })) as { error: string }).error, /Venue name/i);
  assert.match((validateProvisionInput(input({ organizationName: "!!!" })) as { error: string }).error, /letter or number/i);
  assert.match((validateProvisionInput(input({ fieldCount: 0 })) as { error: string }).error, /at least one field/i);
  assert.match((validateProvisionInput(input({ fieldCount: 99 })) as { error: string }).error, /60 fields/i);
});

test("validation guards the billing plan amount", () => {
  assert.deepEqual(validateProvisionInput(input({ plan: { label: "Complex", amountCents: 150000, interval: "month" } })), { ok: true });
  assert.match((validateProvisionInput(input({ plan: { label: "x", amountCents: -1, interval: "month" } })) as { error: string }).error, /zero or more/i);
  // $20,000/yr is a legitimate flagship-sized number — must NOT be rejected.
  assert.deepEqual(validateProvisionInput(input({ plan: { label: "Flagship", amountCents: 20_000_00, interval: "year" } })), { ok: true });
  // A fat-fingered $200,000 is over the guard.
  assert.match((validateProvisionInput(input({ plan: { label: "x", amountCents: 200_000_00, interval: "year" } })) as { error: string }).error, /looks wrong/i);
});

test("tier is derived from field count, matching published pricing", () => {
  assert.equal(tierForFieldCount(1), "Single park");
  assert.equal(tierForFieldCount(4), "Single park");
  assert.equal(tierForFieldCount(5), "Complex");
  assert.equal(tierForFieldCount(12), "Complex");
  assert.equal(tierForFieldCount(13), "Flagship");
  assert.equal(tierForFieldCount(31), "Flagship");
});
