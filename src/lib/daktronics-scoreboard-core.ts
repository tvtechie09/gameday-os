import { createHash } from "node:crypto";

export type ScoreboardEventType = "scoreboard.game_started" | "scoreboard.score_changed" | "scoreboard.period_changed" | "scoreboard.game_final_detected" | "scoreboard.connection_lost" | "scoreboard.reading_received";

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

export type DaktronicsReadingCorePayload = Partial<NormalizedScoreboardState>;

const staleAfterMs = 30_000;

function text(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null; }
function int(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null; }
function status(value: unknown) { return text(value) ?? "unknown"; }
function topBottom(value: unknown): "top" | "bottom" | null { const normalized = text(value)?.toLowerCase(); return normalized === "top" || normalized === "bottom" ? normalized : null; }

export function validateDaktronicsAdapterToken(received: string | null | undefined, expected = process.env.DAKTRONICS_ADAPTER_TOKEN) {
  return Boolean(expected && received && received === expected);
}

export function normalizeDaktronicsReadingPayload(payload: DaktronicsReadingCorePayload): NormalizedScoreboardState {
  return {
    awayScore: int(payload.awayScore) ?? 0,
    balls: int(payload.balls),
    gameClock: text(payload.gameClock),
    homeScore: int(payload.homeScore) ?? 0,
    inning: int(payload.inning),
    outs: int(payload.outs),
    periodLabel: text(payload.periodLabel),
    possession: text(payload.possession),
    shotClock: text(payload.shotClock),
    status: status(payload.status),
    strikes: int(payload.strikes),
    topBottom: topBottom(payload.topBottom),
  };
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
