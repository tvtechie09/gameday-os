export const TRUTH_FIELDS = [
  { domain: "profile", key: "display_name", label: "Display Name" },
  { domain: "profile", key: "preferred_name", label: "Preferred Name" },
  { domain: "profile", key: "first_name", label: "First Name" },
  { domain: "profile", key: "last_name", label: "Last Name" },
] as const;

export type TruthReasonCode =
  | "ORG_AUTHORITY_RULE"
  | "PLATFORM_AUTHORITY_RULE"
  | "PLATFORM_DEFAULT"
  | "LATEST_EQUAL_AUTHORITY"
  | "EQUAL_AUTHORITY_CONFLICT";

export type TruthConflictState =
  | "NO_CONFLICT"
  | "AGREEING_SOURCES"
  | "DIFFERENT_SOURCES"
  | "UNRESOLVED_CONFLICT"
  | "HUMAN_RESOLVED";

export type TruthAssertion<T = unknown> = {
  id: string;
  organizationId: string;
  personId: string;
  provider: string;
  value: T;
  timestamp: string;
  status?: "current" | "stale" | "deleted_at_source";
  sourceStatus?: "active" | "inactive" | "disconnected" | "stale" | "deleted_at_source";
};

export type TruthAuthorityRule = {
  organizationId: string | null;
  domain: string;
  key: string;
  provider: string;
  priority: number;
  active?: boolean;
};

export const truthReasonExplanations: Record<TruthReasonCode, string> = {
  ORG_AUTHORITY_RULE: "Your organization prefers this source for this information.",
  PLATFORM_AUTHORITY_RULE: "GameDay's platform policy prefers this source for this information.",
  PLATFORM_DEFAULT: "No preferred source is configured, so GameDay uses the platform default and most recent report.",
  LATEST_EQUAL_AUTHORITY: "These sources have equal authority, so GameDay uses the uniquely most recently updated value.",
  EQUAL_AUTHORITY_CONFLICT: "Equally authoritative and equally recent sources disagree, so GameDay needs a review before choosing a value.",
};

const providerLabels: Record<string, string> = {
  sportsengine: "SportsEngine",
  gamechanger: "GameChanger",
  teamsnap: "TeamSnap",
  playmetrics: "PlayMetrics",
  leagueapps: "LeagueApps",
  studio_director: "Studio Director",
  csv: "Manual Import",
  gameday_account: "GameDay Account",
  gameday_native: "GameDay",
  gameday_legacy: "GameDay",
};

export function truthProviderLabel(provider: string) {
  return providerLabels[provider.toLowerCase()] ?? provider.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isHumanTruthProvider(provider: string) {
  return provider === "gameday_account" || provider === "gameday_native";
}

function stableValue(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableValue).join(",") + "]";
  return "{" + Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => JSON.stringify(key) + ":" + stableValue(child)).join(",") + "}";
}

export function evaluateEffectiveTruth<T>(input: {
  organizationId: string;
  personId: string;
  domain: string;
  key: string;
  assertions: TruthAssertion<T>[];
  rules: TruthAuthorityRule[];
}) {
  const assertions = input.assertions.filter((assertion) =>
    assertion.organizationId === input.organizationId
    && assertion.personId === input.personId
    && (assertion.status ?? "current") === "current"
    && (assertion.sourceStatus ?? "active") === "active");
  if (assertions.length === 0) return null;

  const ranked = assertions.map((assertion) => {
    const orgRule = input.rules.find((rule) => rule.active !== false && rule.organizationId === input.organizationId && rule.domain === input.domain && rule.key === input.key && rule.provider === assertion.provider);
    const platformRule = input.rules.find((rule) => rule.active !== false && rule.organizationId === null && rule.domain === input.domain && rule.key === input.key && rule.provider === assertion.provider);
    return {
      assertion,
      priority: orgRule?.priority ?? platformRule?.priority ?? 0,
      authority: orgRule ? "ORG_AUTHORITY_RULE" as const : platformRule ? "PLATFORM_AUTHORITY_RULE" as const : "PLATFORM_DEFAULT" as const,
    };
  });
  const highestPriority = Math.max(...ranked.map((item) => item.priority));
  const top = ranked.filter((item) => item.priority === highestPriority);
  const newestTimestamp = [...top].sort((a, b) => b.assertion.timestamp.localeCompare(a.assertion.timestamp))[0].assertion.timestamp;
  const newest = top.filter((item) => item.assertion.timestamp === newestTimestamp);
  const newestValues = new Set(newest.map((item) => stableValue(item.assertion.value)));
  const allValues = new Set(assertions.map((assertion) => stableValue(assertion.value)));

  if (newestValues.size > 1) {
    return {
      effective: null,
      reasonCode: "EQUAL_AUTHORITY_CONFLICT" as const,
      explanation: truthReasonExplanations.EQUAL_AUTHORITY_CONFLICT,
      conflictState: "UNRESOLVED_CONFLICT" as const,
      assertions,
    };
  }

  const winner = [...newest].sort((a, b) => a.assertion.provider.localeCompare(b.assertion.provider) || a.assertion.id.localeCompare(b.assertion.id))[0];
  const reasonCode: TruthReasonCode = top.some((item) => stableValue(item.assertion.value) !== stableValue(winner.assertion.value))
    ? "LATEST_EQUAL_AUTHORITY"
    : winner.authority;
  const differs = allValues.size > 1;
  const conflictState: TruthConflictState = !differs
    ? assertions.length > 1 ? "AGREEING_SOURCES" : "NO_CONFLICT"
    : isHumanTruthProvider(winner.assertion.provider) && winner.authority !== "PLATFORM_DEFAULT" ? "HUMAN_RESOLVED" : "DIFFERENT_SOURCES";
  return { effective: winner.assertion, reasonCode, explanation: truthReasonExplanations[reasonCode], conflictState, assertions };
}
