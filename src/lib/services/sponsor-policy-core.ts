// Sponsor advertising policy — pure, dependency-free.
//
// A venue's advertising policy is usually board-approved: no alcohol, cannabis,
// tobacco, gambling, firearms, political, or adult advertising near youth
// programming. Enforcing it is not us overriding the venue — it is us honoring
// what they told us. See docs/sponsor-prohibited-categories.md.
//
// This differs from category EXCLUSIVITY, which is a commercial term between the
// venue and a sponsor and therefore only warns. A prohibited category is the
// venue's own rule about who may appear on their property, and the failure is
// public and involves families. So: block by default, with a logged override.

import {
  isSponsorCategory,
  RECOMMENDED_PROHIBITED_CATEGORIES,
  sponsorCategoryLabel,
  type SponsorCategoryKey,
} from "./sponsor-category-core.ts";

// The stored value is jsonb, so it can be anything. Unknown keys are dropped
// rather than trusted — a category we can't recognize can't be compared, and a
// policy list full of typos that silently matches nothing is worse than none.
export function readProhibitedCategories(value: unknown): SponsorCategoryKey[] | null {
  if (!Array.isArray(value)) return null;
  const keys = value.filter((entry): entry is SponsorCategoryKey => isSponsorCategory(typeof entry === "string" ? entry : null));
  return [...new Set(keys)];
}

export type EffectivePolicy = {
  categories: SponsorCategoryKey[];
  // True when the org has never saved a policy and we're falling back to the
  // recommended youth-sports default.
  usingDefault: boolean;
};

// Unset is NOT the same as "prohibits nothing". A venue that never opened the
// settings page should still not show gambling ads to families, so an unset
// policy falls back to the recommended default.
//
// The spec's rule is "safe defaults, VISIBLY editable" — never a secret list — so
// `usingDefault` exists to make the UI say plainly that the default is in force
// and can be changed. An explicitly saved empty list is a real decision and is
// honored as "nothing is prohibited".
export function effectiveProhibitedCategories(stored: unknown): EffectivePolicy {
  const parsed = readProhibitedCategories(stored);
  if (parsed === null) {
    return { categories: [...RECOMMENDED_PROHIBITED_CATEGORIES], usingDefault: true };
  }
  return { categories: parsed, usingDefault: false };
}

// An uncategorized sponsor is never auto-prohibited. Blocking everything
// unlabeled would make the feature unusable on day one, when every existing
// sponsor is unlabeled; the UI prompts for a category instead.
export function isCategoryProhibited(category: string | null | undefined, prohibited: readonly SponsorCategoryKey[]): boolean {
  if (!isSponsorCategory(category)) return false;
  return prohibited.includes(category);
}

export type PolicyDecision =
  | { blocked: false }
  | { blocked: true; category: SponsorCategoryKey; categoryLabel: string; message: string };

export function evaluateSponsorPlacement(input: {
  category: string | null | undefined;
  prohibited: readonly SponsorCategoryKey[];
}): PolicyDecision {
  if (!isCategoryProhibited(input.category, input.prohibited)) {
    return { blocked: false };
  }
  const category = input.category as SponsorCategoryKey;
  const categoryLabel = sponsorCategoryLabel(category);
  return {
    blocked: true,
    category,
    categoryLabel,
    message: `${categoryLabel} is on this organization's prohibited advertising list. Remove it from the policy, or record an override with a reason.`,
  };
}

// An override is a real decision, not a checkbox — policies do have legitimate
// exceptions (a brewery backing the adult league), but the door requires intent
// and leaves a trail. A blank reason is not intent.
export const MIN_OVERRIDE_REASON_LENGTH = 10;

export function readOverrideReason(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length >= MIN_OVERRIDE_REASON_LENGTH ? trimmed : null;
}
