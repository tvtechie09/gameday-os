import assert from "node:assert/strict";
import test from "node:test";
import {
  isRestrictedCategory,
  isSponsorCategory,
  RECOMMENDED_PROHIBITED_CATEGORIES,
  SPONSOR_CATEGORIES,
  SPONSOR_CATEGORY_GROUPS,
  SPONSOR_CATEGORY_KEYS,
  sponsorCategoryLabel,
} from "../src/lib/services/sponsor-category-core.ts";

test("category keys are unique — a duplicate would break conflict detection", () => {
  assert.equal(new Set(SPONSOR_CATEGORY_KEYS).size, SPONSOR_CATEGORY_KEYS.length);
});

test("isSponsorCategory accepts known keys and rejects free text", () => {
  assert.equal(isSponsorCategory("bank_financial"), true);
  assert.equal(isSponsorCategory("alcohol"), true);
  // The reason the vocabulary is fixed: these must NOT pass as categories.
  assert.equal(isSponsorCategory("Bank"), false);
  assert.equal(isSponsorCategory("banking"), false);
  assert.equal(isSponsorCategory("First National Bank"), false);
  assert.equal(isSponsorCategory(""), false);
  assert.equal(isSponsorCategory(null), false);
  assert.equal(isSponsorCategory(undefined), false);
});

test("an unset or unknown category reads as Uncategorized, never throws", () => {
  // A sponsor created before this field existed is a normal state, not an error.
  assert.equal(sponsorCategoryLabel(null), "Uncategorized");
  assert.equal(sponsorCategoryLabel(undefined), "Uncategorized");
  assert.equal(sponsorCategoryLabel("nonsense"), "Uncategorized");
  assert.equal(sponsorCategoryLabel("bank_financial"), "Bank / Financial");
});

test("restricted flags mark the classes an ad policy commonly excludes", () => {
  assert.equal(isRestrictedCategory("alcohol"), true);
  assert.equal(isRestrictedCategory("gambling"), true);
  assert.equal(isRestrictedCategory("political"), true);
  assert.equal(isRestrictedCategory("bank_financial"), false);
  assert.equal(isRestrictedCategory("restaurant"), false);
  // Unset is not restricted — absence of a category is not a policy violation.
  assert.equal(isRestrictedCategory(null), false);
});

test("the recommended policy list is exactly the restricted categories", () => {
  const restricted = SPONSOR_CATEGORIES.filter((c) => c.restricted).map((c) => c.key);
  assert.deepEqual(RECOMMENDED_PROHIBITED_CATEGORIES, restricted);
  assert.ok(RECOMMENDED_PROHIBITED_CATEGORIES.includes("alcohol"));
  assert.ok(RECOMMENDED_PROHIBITED_CATEGORIES.includes("gambling"));
  assert.ok(!RECOMMENDED_PROHIBITED_CATEGORIES.includes("restaurant"));
});

test("picker groups cover every category exactly once", () => {
  const grouped = SPONSOR_CATEGORY_GROUPS.flatMap((g) => g.categories.map((c) => c.key));
  assert.equal(grouped.length, SPONSOR_CATEGORIES.length);
  assert.deepEqual([...grouped].sort(), [...SPONSOR_CATEGORY_KEYS].sort());
});

test("every category has a human label", () => {
  for (const category of SPONSOR_CATEGORIES) {
    assert.ok(category.label.length > 0, `${category.key} needs a label`);
    assert.notEqual(category.label, category.key);
  }
});
