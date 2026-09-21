import { timingSafeEqual } from "node:crypto";

export type ScoreboardProviderKey = "daktronics" | "fairplay" | "nevco" | "electro_mech" | "generic";
export type ScoreboardAuthorityRole = "PRIMARY" | "SECONDARY" | "FALLBACK" | "DISPLAY_ONLY";
export type ScoreboardDirection = "input" | "output";

export type ScoreboardAdapterCapabilities = {
  directions: ScoreboardDirection[];
  supportsFullSnapshot: boolean;
  supportsOriginCorrelation: boolean;
};

export type NormalizedScoreboardState = {
  awayScore: number;
  balls: number | null;
  gameClock: string | null;
  homeScore: number;
  inning: number | null;
  outs: number | null;
  periodLabel: string | null;
  possession: string | null;
  shotClock: string | null;
  status: string;
  strikes: number | null;
  topBottom: "top" | "bottom" | null;
};

export type ScoreboardEventEnvelope = {
  deviceId: string;
  eventAt: string;
  fieldId: string;
  originEventId: string | null;
  provider: ScoreboardProviderKey;
  receivedAt: string;
  sequence: number | null;
  sessionId: string | null;
  state: NormalizedScoreboardState;
};

export type ScoreboardAuthorityDecision =
  | { action: "accept"; reason: "primary_source" | "fallback_authorized" }
  | { action: "ignore"; reason: "display_only" | "echo" | "lower_authority" }
  | { action: "conflict"; reason: "primary_sources_diverged" };

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function int(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Math.trunc(Number(value));
  return null;
}

function topBottom(value: unknown): "top" | "bottom" | null {
  const normalized = text(value)?.toLowerCase();
  if (normalized === "top" || normalized === "t") return "top";
  if (normalized === "bottom" || normalized === "bot" || normalized === "b") return "bottom";
  return null;
}

export function normalizeScoreboardPayload(payload: Record<string, unknown>): NormalizedScoreboardState {
  return {
    awayScore: int(payload.awayScore ?? payload.away_score ?? payload.visitorScore ?? payload.visitor_score) ?? 0,
    balls: int(payload.balls),
    gameClock: text(payload.gameClock ?? payload.game_clock ?? payload.clock),
    homeScore: int(payload.homeScore ?? payload.home_score) ?? 0,
    inning: int(payload.inning),
    outs: int(payload.outs),
    periodLabel: text(payload.periodLabel ?? payload.period_label ?? payload.period),
    possession: text(payload.possession),
    shotClock: text(payload.shotClock ?? payload.shot_clock),
    status: text(payload.status) ?? "unknown",
    strikes: int(payload.strikes),
    topBottom: topBottom(payload.topBottom ?? payload.top_bottom ?? payload.inning_half),
  };
}

export function normalizeProviderKey(value: unknown): ScoreboardProviderKey | null {
  const normalized = text(value)?.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replaceAll(/^_|_$/g, "");
  if (normalized === "fair_play" || normalized === "fairplay") return "fairplay";
  if (normalized === "electro_mech" || normalized === "electromech") return "electro_mech";
  if (normalized === "daktronics" || normalized === "nevco" || normalized === "generic") return normalized;
  return null;
}

export function providerMatchesManufacturer(provider: ScoreboardProviderKey, manufacturer: string) {
  return normalizeProviderKey(manufacturer) === provider || provider === "generic";
}

function safeTokenEqual(received: string | null | undefined, expected: string | null | undefined) {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function validateScoreboardDeviceToken(
  received: string | null | undefined,
  input: { deviceKey: string; provider: ScoreboardProviderKey },
  env: NodeJS.ProcessEnv = process.env,
) {
  let provisionedTokens: Record<string, string> = {};
  try {
    provisionedTokens = JSON.parse(env.SCOREBOARD_DEVICE_TOKENS ?? "{}") as Record<string, string>;
  } catch {
    return false;
  }
  const scoped = provisionedTokens[input.deviceKey];
  const legacyKey = `${input.provider.toUpperCase()}_ADAPTER_TOKEN`;
  const legacy = env[legacyKey];
  return safeTokenEqual(received, scoped ?? legacy);
}

export function resolveScoreboardAuthority(input: {
  incomingOriginEventId?: string | null;
  incomingRole: ScoreboardAuthorityRole;
  incomingStateHash: string;
  projectedOriginEventId?: string | null;
  primaryStateHash?: string | null;
  takeoverAuthorized?: boolean;
}): ScoreboardAuthorityDecision {
  if (input.incomingOriginEventId && input.projectedOriginEventId === input.incomingOriginEventId) {
    return { action: "ignore", reason: "echo" };
  }
  if (input.incomingRole === "DISPLAY_ONLY") return { action: "ignore", reason: "display_only" };
  if (input.incomingRole === "PRIMARY") {
    if (input.primaryStateHash && input.primaryStateHash !== input.incomingStateHash) {
      return { action: "conflict", reason: "primary_sources_diverged" };
    }
    return { action: "accept", reason: "primary_source" };
  }
  if (input.incomingRole === "FALLBACK" && input.takeoverAuthorized) {
    return { action: "accept", reason: "fallback_authorized" };
  }
  return { action: "ignore", reason: "lower_authority" };
}

export const scoreboardAdapterCapabilities: Record<ScoreboardProviderKey, ScoreboardAdapterCapabilities> = {
  daktronics: { directions: ["input"], supportsFullSnapshot: true, supportsOriginCorrelation: false },
  fairplay: { directions: ["input"], supportsFullSnapshot: true, supportsOriginCorrelation: false },
  nevco: { directions: [], supportsFullSnapshot: false, supportsOriginCorrelation: false },
  electro_mech: { directions: [], supportsFullSnapshot: false, supportsOriginCorrelation: false },
  generic: { directions: ["input"], supportsFullSnapshot: true, supportsOriginCorrelation: true },
};
