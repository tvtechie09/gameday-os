// Onboarding a new customer (pure core, dependency-free).
//
// Our motion is sales-led: a GM says yes, then GameDay staff stand the venue up.
// There is deliberately NO public self-serve signup — that would let anyone create
// an organization, which is abuse surface we don't need (see
// docs/pricing-and-packaging.md: venue pays, we hand-invoice founding venues).
//
// This turns "yes" into a live venue in one submit instead of a five-page slog.
// All logic here is IO-free so it's unit-testable; provisioning.ts does the writes.

// --- Packages ----------------------------------------------------------------

// The published tiers (docs/pricing-and-packaging.md). Prices there are anchors to
// validate, not committed list prices, so amountCents is left to the operator --
// this catalog fixes the SHAPE (which tier, what's included), not the number.
export type PackageKey = "single_park" | "complex" | "flagship" | "district";

export type PackageDefinition = {
  key: PackageKey;
  label: string;
  sizeHint: string;
  includes: string[];
  minFields: number;
  maxFields: number | null;
};

export const packageCatalog: PackageDefinition[] = [
  {
    key: "single_park",
    label: "Single park",
    sizeHint: "1–4 fields",
    includes: ["Command Center", "Public field pages", "Alerts"],
    minFields: 1,
    maxFields: 4,
  },
  {
    key: "complex",
    label: "Complex",
    sizeHint: "5–12 fields",
    includes: ["Everything in Single park", "Officials", "Work orders", "Bookings & permits", "Storm response"],
    minFields: 5,
    maxFields: 12,
  },
  {
    key: "flagship",
    label: "Flagship",
    sizeHint: "13+ fields",
    includes: ["Everything in Complex", "Systems health", "Device integrations", "Multi-field ops"],
    minFields: 13,
    maxFields: null,
  },
  {
    key: "district",
    label: "District",
    sizeHint: "Multi-venue",
    includes: ["Everything in Flagship", "Cross-venue reporting"],
    minFields: 1,
    maxFields: null,
  },
];

export function packageByKey(key: string): PackageDefinition | null {
  return packageCatalog.find((entry) => entry.key === key) ?? null;
}

// Field count is the honest unit of both size and value, so it picks the tier.
// District is multi-venue and never inferred from one venue's field count.
export function packageForFieldCount(fieldCount: number): PackageDefinition {
  const count = Math.max(1, Math.floor(fieldCount || 0));
  const match = packageCatalog.find(
    (entry) => entry.key !== "district" && count >= entry.minFields && (entry.maxFields === null || count <= entry.maxFields),
  );
  // Unreachable in practice (flagship has no ceiling); keeps the return total.
  return match ?? packageCatalog[2];
}

// Kept for callers/tests that predate the catalog.
export function tierForFieldCount(fieldCount: number): string {
  return packageForFieldCount(fieldCount).label;
}

// --- Input -------------------------------------------------------------------

export type ProvisionPlan = { label: string; amountCents: number; interval: "month" | "year" } | null;

// A field complex sells the Venue OS subscription. An organization also runs
// teams, which adds the league/club line -- and lives in the OTHER app, so we
// capture intent here and invite the owner rather than forging their identity
// (gdt_org_registry.owner_auth_user_id is NOT NULL; sales cannot fabricate it).
export type AccountType = "complex" | "organization";

export type TechnologyOptions = {
  scoreboards: boolean;
  cameras: boolean;
  audio: boolean;
};

export type LeagueIntent = {
  leagueName: string;
  teamCount: number;
  ownerEmail: string;
} | null;

export type ProvisionInput = {
  accountType: AccountType;
  organizationName: string;
  venueName: string;
  address?: string;
  city?: string;
  state?: string;
  // IANA zone the venue operates in. Omitted means Central, matching the column
  // default — but every venue outside Central MUST set it here: the operating
  // day, delay math, and slot windows are all computed in this zone.
  timezone?: string;
  fieldCount: number;
  fieldNamePattern: string; // e.g. "Field {n}" or "Diamond {n}"
  // 0 = fields are not divisible. 2–4 = each field splits into that many
  // children (A/B/C…), which is how a big diamond becomes three small ones for
  // an 8U Saturday.
  splitsPerField: number;
  sportType: string;
  technology: TechnologyOptions;
  league: LeagueIntent;
  packageKey: PackageKey;
  plan: ProvisionPlan;
  // Demo tenants are disposable: stamped is_demo and removable in one click.
  isDemo: boolean;
};

// --- Naming ------------------------------------------------------------------

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

// Court sports get a 'court' play surface; everything else keeps the flagship's
// 'field' convention (Crossroads' baseball surfaces are all 'field', so we don't
// introduce 'diamond' and split the data model's vocabulary).
export function surfaceTypeForSport(sportType: string | null | undefined): "field" | "court" {
  return sportType === "volleyball" || sportType === "basketball" ? "court" : "field";
}

// --- The field plan ----------------------------------------------------------

// One row per field we will create. Children carry the parent's INDEX rather than
// an id, because ids don't exist until provisioning.ts writes the parents.
//
// Mirrors the flagship venue's real shape (verified against Crossroads):
//   parent -> layout_role "parent",      layout_type "Full",  no surface_code
//   child  -> layout_role "split_child", layout_type "Split", surface_code A/B/C
export type PlannedField = {
  name: string;
  layoutRole: "parent" | "split_child" | "standalone";
  layoutType: "Full" | "Split";
  surfaceCode: string | null;
  parentIndex: number | null;
};

const SPLIT_CODES = ["A", "B", "C", "D"];

export const MAX_SPLITS_PER_FIELD = 4;
// 60 parents x 4 children + 60 parents = 300 rows, already past what anyone
// should create in one submit.
export const MAX_TOTAL_FIELDS = 300;

export function planFields(input: Pick<ProvisionInput, "fieldCount" | "fieldNamePattern" | "splitsPerField">): PlannedField[] {
  const parents = buildFieldNames(input.fieldCount, input.fieldNamePattern);
  const splits = Math.max(0, Math.min(MAX_SPLITS_PER_FIELD, Math.floor(input.splitsPerField || 0)));
  const planned: PlannedField[] = [];

  parents.forEach((name) => {
    planned.push({
      name,
      // A field that never splits is standalone, not a parent of nothing.
      layoutRole: splits > 0 ? "parent" : "standalone",
      layoutType: "Full",
      surfaceCode: null,
      parentIndex: null,
    });
  });

  if (splits === 0) return planned;

  // Children are appended after every parent so parentIndex stays stable and
  // provisioning.ts can insert parents first, then map ids by index.
  parents.forEach((name, parentIndex) => {
    for (let i = 0; i < splits; i += 1) {
      const code = SPLIT_CODES[i];
      planned.push({
        name: `${name}${code}`.slice(0, 80),
        layoutRole: "split_child",
        layoutType: "Split",
        surfaceCode: code,
        parentIndex,
      });
    }
  });

  return planned;
}

// --- Validation --------------------------------------------------------------

export type ProvisionValidation = { ok: true } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateProvisionInput(input: ProvisionInput): ProvisionValidation {
  if (!input.organizationName?.trim()) return { ok: false, error: "Organization name is required." };
  if (!input.venueName?.trim()) return { ok: false, error: "Venue name is required." };
  if (!slugify(input.organizationName)) return { ok: false, error: "Organization name needs at least one letter or number." };
  if (!Number.isFinite(input.fieldCount) || input.fieldCount < 1) return { ok: false, error: "Add at least one field." };
  if (input.fieldCount > 60) return { ok: false, error: "That's more than 60 fields — create the venue, then bulk-add the rest." };

  const splits = Math.floor(input.splitsPerField || 0);
  if (splits < 0) return { ok: false, error: "Splits per field can't be negative." };
  if (splits === 1) return { ok: false, error: "A field that splits into one is just the field — use 0, or 2 and up." };
  if (splits > MAX_SPLITS_PER_FIELD) return { ok: false, error: `We can split a field up to ${MAX_SPLITS_PER_FIELD} ways.` };

  const total = planFields(input).length;
  if (total > MAX_TOTAL_FIELDS) {
    return { ok: false, error: `${input.fieldCount} fields split ${splits} ways is ${total} rows — over the ${MAX_TOTAL_FIELDS} limit for one submit.` };
  }

  if (!packageByKey(input.packageKey)) return { ok: false, error: "Pick a package." };

  if (input.accountType === "organization") {
    if (!input.league) return { ok: false, error: "An organization runs teams — add the league details." };
    if (!input.league.leagueName?.trim()) return { ok: false, error: "League name is required." };
    if (!Number.isFinite(input.league.teamCount) || input.league.teamCount < 1) {
      return { ok: false, error: "An organization needs at least one team." };
    }
    if (input.league.teamCount > 500) return { ok: false, error: "Over 500 teams — let's talk before provisioning that." };
    // The team app keys an org to a real owner (gdt_org_registry.owner_auth_user_id
    // is NOT NULL). We can't create that from here, so we invite them instead --
    // which means the address has to be right.
    if (!EMAIL.test(input.league.ownerEmail?.trim() ?? "")) {
      return { ok: false, error: "A valid owner email is required — they receive the invite that creates the league." };
    }
  }

  if (input.plan) {
    if (!Number.isFinite(input.plan.amountCents) || input.plan.amountCents < 0) return { ok: false, error: "Plan amount must be zero or more." };
    if (input.plan.amountCents > 100_000_00) return { ok: false, error: "Plan amount looks wrong (over $100,000)." };
  }
  return { ok: true };
}

// --- Summary -----------------------------------------------------------------

// What the operator is about to create, so the form can show it before submit.
// Provisioning is all-or-nothing but not undoable for real tenants; a preview is
// cheaper than a mistake.
export type ProvisionSummary = {
  packageLabel: string;
  parentFields: number;
  childFields: number;
  totalFields: number;
  playSurfaces: number;
  scoreboards: number;
  cameras: number;
  audioProfiles: number;
  teamsInvited: number;
  isDemo: boolean;
};

export function summarizeProvision(input: ProvisionInput): ProvisionSummary {
  const planned = planFields(input);
  const parents = planned.filter((f) => f.parentIndex === null).length;
  const children = planned.length - parents;
  return {
    packageLabel: packageByKey(input.packageKey)?.label ?? "—",
    parentFields: parents,
    childFields: children,
    totalFields: planned.length,
    // One surface per field row, matching the flagship's 1:1 shape.
    playSurfaces: planned.length,
    // A scoreboard belongs to a playable surface. Split children are what games
    // are actually played on when a field is divided, so they get boards too.
    scoreboards: input.technology.scoreboards ? planned.length : 0,
    // Cameras are per parent field: you cover the physical field, not each half.
    cameras: input.technology.cameras ? parents : 0,
    // PA is venue-wide.
    audioProfiles: input.technology.audio ? 1 : 0,
    teamsInvited: input.accountType === "organization" ? (input.league?.teamCount ?? 0) : 0,
    isDemo: input.isDemo,
  };
}
