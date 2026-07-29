// Sponsor categories — the shared vocabulary (pure, dependency-free).
//
// ONE list serves two features that both need it:
//   * category exclusivity ("we're the only bank at this complex") —
//     docs/sponsor-category-exclusivity.md
//   * prohibited categories (a venue's advertising policy) —
//     docs/sponsor-prohibited-categories.md
//
// It is a FIXED vocabulary, not free text, because both features compare
// categories to each other. Free text can't be compared: "Bank", "bank",
// "Banking" and "First National Bank" would all be different categories and
// every conflict check would silently pass.
//
// Extend it from what real venues actually sell — don't guess more up front.

export type SponsorCategoryKey =
  // --- industries (what a venue sells exclusivity in) ---
  | "bank_financial"
  | "insurance"
  | "healthcare"
  | "dental_orthodontic"
  | "restaurant"
  | "auto"
  | "real_estate"
  | "retail"
  | "fitness"
  | "home_services"
  | "legal"
  | "youth_sports_retail"
  | "other"
  // --- restricted classes (what an advertising policy commonly excludes) ---
  | "alcohol"
  | "cannabis"
  | "tobacco_vape"
  | "gambling"
  | "firearms"
  | "political"
  | "adult";

export type SponsorCategory = {
  key: SponsorCategoryKey;
  label: string;
  // Commonly prohibited near youth programming. This does NOT block anything on
  // its own — it drives the recommended default policy list and lets the picker
  // group these separately so nobody selects one by accident. A venue with an
  // adult league can legitimately sell an alcohol sponsorship.
  restricted: boolean;
};

export const SPONSOR_CATEGORIES: SponsorCategory[] = [
  { key: "bank_financial", label: "Bank / Financial", restricted: false },
  { key: "insurance", label: "Insurance", restricted: false },
  { key: "healthcare", label: "Healthcare / Medical", restricted: false },
  { key: "dental_orthodontic", label: "Dental / Orthodontic", restricted: false },
  { key: "restaurant", label: "Restaurant / Food", restricted: false },
  { key: "auto", label: "Auto / Dealership", restricted: false },
  { key: "real_estate", label: "Real Estate", restricted: false },
  { key: "retail", label: "Retail", restricted: false },
  { key: "fitness", label: "Fitness / Training", restricted: false },
  { key: "home_services", label: "Home Services / Trades", restricted: false },
  { key: "legal", label: "Legal", restricted: false },
  { key: "youth_sports_retail", label: "Youth Sports Retail", restricted: false },
  { key: "other", label: "Other", restricted: false },
  { key: "alcohol", label: "Alcohol", restricted: true },
  { key: "cannabis", label: "Cannabis", restricted: true },
  { key: "tobacco_vape", label: "Tobacco / Vape", restricted: true },
  { key: "gambling", label: "Gambling / Sports Betting", restricted: true },
  { key: "firearms", label: "Firearms", restricted: true },
  { key: "political", label: "Political / Advocacy", restricted: true },
  { key: "adult", label: "Adult", restricted: true },
];

export const SPONSOR_CATEGORY_KEYS = SPONSOR_CATEGORIES.map((c) => c.key);

const BY_KEY = new Map(SPONSOR_CATEGORIES.map((c) => [c.key, c]));

export function isSponsorCategory(value: string | null | undefined): value is SponsorCategoryKey {
  return typeof value === "string" && BY_KEY.has(value as SponsorCategoryKey);
}

// Unknown or unset reads as "Uncategorized" rather than throwing — a sponsor
// created before this field existed is a normal state, not an error.
export function sponsorCategoryLabel(value: string | null | undefined): string {
  if (!isSponsorCategory(value)) return "Uncategorized";
  return BY_KEY.get(value)!.label;
}

export function isRestrictedCategory(value: string | null | undefined): boolean {
  return isSponsorCategory(value) && BY_KEY.get(value)!.restricted;
}

// The recommended starting advertising policy for a youth-sports venue. Used in
// Phase 2 to pre-check the onboarding policy list — VISIBLY and uncheckably, so
// the safe path is the default path without us enforcing a secret list.
export const RECOMMENDED_PROHIBITED_CATEGORIES: SponsorCategoryKey[] = SPONSOR_CATEGORIES.filter((c) => c.restricted).map((c) => c.key);

// Grouped for the picker so restricted classes are visually separated from
// ordinary industries.
export const SPONSOR_CATEGORY_GROUPS: Array<{ label: string; categories: SponsorCategory[] }> = [
  { label: "Industry", categories: SPONSOR_CATEGORIES.filter((c) => !c.restricted) },
  { label: "Commonly restricted near youth programming", categories: SPONSOR_CATEGORIES.filter((c) => c.restricted) },
];
