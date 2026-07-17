// Onboarding a new customer (pure core, dependency-free).
//
// Our motion is sales-led: a GM says yes, then GameDay staff stand the venue up.
// There is deliberately NO public self-serve signup — that would let anyone create
// an organization, which is abuse surface we don't need (see
// docs/pricing-and-packaging.md: venue pays, we hand-invoice founding venues).
//
// This turns "yes" into a live venue in one submit instead of a five-page slog.
// All logic here is IO-free so it's unit-testable; provisioning.ts does the writes.

export type ProvisionPlan = { label: string; amountCents: number; interval: "month" | "year" } | null;

export type ProvisionInput = {
  organizationName: string;
  venueName: string;
  address?: string;
  city?: string;
  state?: string;
  fieldCount: number;
  fieldNamePattern: string; // e.g. "Field {n}" or "Diamond {n}"
  sportType: string;
  plan: ProvisionPlan;
};

// URL-safe org slug. Organizations.slug is required and should be stable/unique.
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// "Field {n}" x3 -> ["Field 1","Field 2","Field 3"]. A pattern without {n} gets
// the number appended, so a careless entry still yields distinct field names
// rather than three fields all called the same thing.
export function buildFieldNames(count: number, pattern: string): string[] {
  const safeCount = Math.max(0, Math.min(60, Math.floor(count || 0)));
  const base = (pattern || "Field {n}").trim() || "Field {n}";
  const hasToken = base.includes("{n}");
  return Array.from({ length: safeCount }, (_, i) =>
    (hasToken ? base.replace(/\{n\}/g, String(i + 1)) : `${base} ${i + 1}`).slice(0, 80)
  );
}

export type ProvisionValidation = { ok: true } | { ok: false; error: string };

export function validateProvisionInput(input: ProvisionInput): ProvisionValidation {
  if (!input.organizationName?.trim()) return { ok: false, error: "Organization name is required." };
  if (!input.venueName?.trim()) return { ok: false, error: "Venue name is required." };
  if (!slugify(input.organizationName)) return { ok: false, error: "Organization name needs at least one letter or number." };
  if (!Number.isFinite(input.fieldCount) || input.fieldCount < 1) return { ok: false, error: "Add at least one field." };
  if (input.fieldCount > 60) return { ok: false, error: "That's more than 60 fields — create the venue, then bulk-add the rest." };
  if (input.plan) {
    if (!Number.isFinite(input.plan.amountCents) || input.plan.amountCents < 0) return { ok: false, error: "Plan amount must be zero or more." };
    if (input.plan.amountCents > 100_000_00) return { ok: false, error: "Plan amount looks wrong (over $100,000)." };
  }
  return { ok: true };
}

// Which tier this venue lands in, by field count — matches the published pricing
// (docs/pricing-and-packaging.md). Used to pre-fill the plan label at onboarding.
export function tierForFieldCount(fieldCount: number): string {
  if (fieldCount <= 4) return "Single park";
  if (fieldCount <= 12) return "Complex";
  return "Flagship";
}
