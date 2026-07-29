import assert from "node:assert/strict";
import test from "node:test";
import { RECOMMENDED_PROHIBITED_CATEGORIES } from "../src/lib/services/sponsor-category-core.ts";
import {
  effectiveProhibitedCategories,
  evaluateSponsorPlacement,
  isCategoryProhibited,
  MIN_OVERRIDE_REASON_LENGTH,
  readOverrideReason,
  readProhibitedCategories,
} from "../src/lib/services/sponsor-policy-core.ts";

test("readProhibitedCategories: a non-array stored value is 'not configured', not empty", () => {
  assert.equal(readProhibitedCategories(null), null);
  assert.equal(readProhibitedCategories(undefined), null);
  assert.equal(readProhibitedCategories("alcohol"), null);
  assert.equal(readProhibitedCategories({ alcohol: true }), null);
});

test("readProhibitedCategories: unknown keys are dropped, not trusted", () => {
  // A policy list of typos that silently matches nothing is worse than no list.
  assert.deepEqual(readProhibitedCategories(["alcohol", "Alcohol", "booze", 7, null]), ["alcohol"]);
});

test("readProhibitedCategories: duplicates collapse, and an empty array stays empty", () => {
  assert.deepEqual(readProhibitedCategories(["alcohol", "alcohol", "gambling"]), ["alcohol", "gambling"]);
  assert.deepEqual(readProhibitedCategories([]), []);
});

test("an unconfigured org falls back to the recommended default, flagged as such", () => {
  // A venue that never opened the settings page still must not show gambling ads.
  const policy = effectiveProhibitedCategories(null);
  assert.equal(policy.usingDefault, true);
  assert.deepEqual(policy.categories, RECOMMENDED_PROHIBITED_CATEGORIES);
  assert.ok(policy.categories.includes("alcohol"));
});

test("an explicitly saved empty list means 'nothing prohibited' and is honored", () => {
  // This is a real decision by the venue, not an absence of one — do not
  // silently re-apply the default over it.
  const policy = effectiveProhibitedCategories([]);
  assert.equal(policy.usingDefault, false);
  assert.deepEqual(policy.categories, []);
  assert.equal(isCategoryProhibited("alcohol", policy.categories), false);
});

test("a saved policy is used verbatim, including one looser than the default", () => {
  // The adult-league complex that unchecks alcohol.
  const policy = effectiveProhibitedCategories(["gambling", "adult"]);
  assert.equal(policy.usingDefault, false);
  assert.deepEqual(policy.categories, ["gambling", "adult"]);
  assert.equal(isCategoryProhibited("alcohol", policy.categories), false);
  assert.equal(isCategoryProhibited("gambling", policy.categories), true);
});

test("an uncategorized sponsor is never auto-prohibited", () => {
  // Every sponsor is unlabeled on day one; blocking them all would make the
  // feature unusable. The UI prompts for a category instead.
  const policy = effectiveProhibitedCategories(null);
  assert.equal(isCategoryProhibited(null, policy.categories), false);
  assert.equal(isCategoryProhibited(undefined, policy.categories), false);
  assert.equal(isCategoryProhibited("", policy.categories), false);
  assert.equal(isCategoryProhibited("not-a-real-category", policy.categories), false);
});

test("evaluateSponsorPlacement allows an ordinary industry", () => {
  const decision = evaluateSponsorPlacement({ category: "bank_financial", prohibited: RECOMMENDED_PROHIBITED_CATEGORIES });
  assert.equal(decision.blocked, false);
});

test("evaluateSponsorPlacement blocks a prohibited category with a human label", () => {
  const decision = evaluateSponsorPlacement({ category: "gambling", prohibited: RECOMMENDED_PROHIBITED_CATEGORIES });
  assert.equal(decision.blocked, true);
  if (!decision.blocked) return;
  assert.equal(decision.category, "gambling");
  assert.equal(decision.categoryLabel, "Gambling / Sports Betting");
  // The message must name the category and both exits — fix the policy, or override.
  assert.match(decision.message, /Gambling/);
  assert.match(decision.message, /override/i);
});

test("override requires a real reason, not a blank or a shrug", () => {
  assert.equal(readOverrideReason(null), null);
  assert.equal(readOverrideReason(""), null);
  assert.equal(readOverrideReason("   "), null);
  assert.equal(readOverrideReason("ok"), null);
  assert.equal(readOverrideReason("y".repeat(MIN_OVERRIDE_REASON_LENGTH - 1)), null);
  assert.equal(readOverrideReason("  Adult league only, per board vote 6/12.  "), "Adult league only, per board vote 6/12.");
});
