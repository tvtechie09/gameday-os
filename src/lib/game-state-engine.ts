import {
  normalizeScoreboardState,
  type NormalizedGameState,
  type ScoreboardFeedSource,
  type ScoreboardRawState,
} from "./scoreboard-feed.ts";

export type GameStateSource = ScoreboardFeedSource;
export type GameState = NormalizedGameState;

export function acceptScoreboardFeedState(
  state: ScoreboardRawState,
  options: { isOfficial?: boolean; source?: GameStateSource } = {},
): GameState {
  return normalizeScoreboardState(state, options);
}

export function appendGameStateHistoryEvent(state: GameState, message: string): GameState {
  return {
    ...state,
    auditEvents: [...state.auditEvents, message],
  };
}
