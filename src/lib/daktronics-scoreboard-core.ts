import { createHash } from "node:crypto";
import { normalizeScoreboardPayload, type NormalizedScoreboardState } from "./scoreboard-adapter-core.ts";

export type ScoreboardEventType = "scoreboard.game_started" | "scoreboard.score_changed" | "scoreboard.period_changed" | "scoreboard.game_final_detected" | "scoreboard.connection_lost" | "scoreboard.reading_received";

export type { NormalizedScoreboardState } from "./scoreboard-adapter-core.ts";

export type DaktronicsReadingCorePayload = Partial<NormalizedScoreboardState>;

const staleAfterMs = 30_000;

export function validateDaktronicsAdapterToken(received: string | null | undefined, expected = process.env.DAKTRONICS_ADAPTER_TOKEN) {
  return Boolean(expected && received && received === expected);
}

export function normalizeDaktronicsReadingPayload(payload: DaktronicsReadingCorePayload): NormalizedScoreboardState {
  return normalizeScoreboardPayload(payload as Record<string, unknown>);
}

export function hashScoreboardState(state: NormalizedScoreboardState) {
  return createHash("sha256").update(JSON.stringify(state)).digest("hex");
}

export function isScoreboardReadingStale(readAt: string | null | undefined, now = new Date()) {
  if (!readAt) return true;
  return now.getTime() - new Date(readAt).getTime() > staleAfterMs;
}

export function getScoreboardEventTypes(previous: NormalizedScoreboardState | null, current: NormalizedScoreboardState): ScoreboardEventType[] {
  if (!previous) return current.status === "active" || current.status === "live" ? ["scoreboard.game_started", "scoreboard.reading_received"] : ["scoreboard.reading_received"];
  const events: ScoreboardEventType[] = [];
  if (previous.homeScore !== current.homeScore || previous.awayScore !== current.awayScore) events.push("scoreboard.score_changed");
  if (previous.periodLabel !== current.periodLabel || previous.inning !== current.inning || previous.topBottom !== current.topBottom) events.push("scoreboard.period_changed");
  if (current.status === "final" && previous.status !== "final") events.push("scoreboard.game_final_detected");
  return events;
}
