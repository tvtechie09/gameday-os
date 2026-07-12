import {
  crossroadsFields,
  crossroadsGames,
  crossroadsPlaySurfaces,
  crossroadsVenue,
  type CrossroadsGame,
  type CrossroadsGameStatus,
} from "./demo/crossroads.ts";

export type ScoreboardFeedSource = "daktronics_readonly" | "mock_gamechanger" | "manual_entry";
export type ScoreboardFeedDemoSource = "daktronics" | "gamechanger" | "manual";
export type ScoreboardFeedIndicator =
  | "live"
  | "warmups"
  | "delayed"
  | "final"
  | "data_stale"
  | "scoreboard_offline"
  | "manual_update"
  | "future_gamechanger_source";

export type ScoreboardProviderHealthStatus = "healthy" | "stale" | "offline" | "disconnected";

export interface ScoreboardRawState {
  awayScore: number;
  awayTeam: string;
  balls?: number;
  controllerModel: "All Sport 5000";
  fieldId: string;
  gameId: string;
  homeScore: number;
  homeTeam: string;
  inning: string;
  lastUpdatedAt: string;
  outs?: number;
  playSurfaceId: string;
  providerStatus: ScoreboardProviderHealthStatus;
  scoreboardStatus: CrossroadsGameStatus | "offline" | "stale";
  sourceDetail: string;
  strikes?: number;
  venueId: string;
}

export interface NormalizedGameState {
  auditEvents: string[];
  awayScore: number;
  awayTeam: string;
  balls?: number;
  fieldId: string;
  freshness: ScoreboardProviderHealthStatus;
  gameId: string;
  homeScore: number;
  homeTeam: string;
  indicators: ScoreboardFeedIndicator[];
  inning: string;
  isOfficial: boolean;
  lastUpdatedAt: string;
  outs?: number;
  playSurfaceId: string;
  providerId: string;
  source: ScoreboardFeedSource;
  status: CrossroadsGameStatus | "scoreboard_offline" | "data_stale";
  strikes?: number;
  venueId: string;
}

export interface ScoreboardProviderHealth {
  checkedAt: string;
  message: string;
  providerId: string;
  status: ScoreboardProviderHealthStatus;
}

export interface ScoreboardInputProvider {
  providerId: string;
  venueId: string;
  fieldId: string;
  playSurfaceId: string;
  connect(): Promise<ScoreboardProviderHealth>;
  disconnect(): Promise<ScoreboardProviderHealth>;
  readCurrentState(): Promise<ScoreboardRawState>;
  subscribeToUpdates(callback: (state: ScoreboardRawState) => void): () => void;
  normalizeScoreboardState(state: ScoreboardRawState, options?: { isOfficial?: boolean; source?: ScoreboardFeedSource }): NormalizedGameState;
  healthCheck(): Promise<ScoreboardProviderHealth>;
}

export const scoreboardFeedDemoSources: Array<{ id: ScoreboardFeedDemoSource; label: string; source: ScoreboardFeedSource }> = [
  { id: "daktronics", label: "Daktronics Read-Only", source: "daktronics_readonly" },
  { id: "gamechanger", label: "Mock GameChanger", source: "mock_gamechanger" },
  { id: "manual", label: "Manual Entry", source: "manual_entry" },
];

const now = "2026-06-29T14:05:00.000Z";
const staleTime = "2026-06-29T13:41:00.000Z";

function baseRawState(game: CrossroadsGame, overrides: Partial<ScoreboardRawState> = {}): ScoreboardRawState {
  return {
    awayScore: game.awayScore,
    awayTeam: game.awayTeam,
    balls: game.status === "live" ? 2 : 0,
    controllerModel: "All Sport 5000",
    fieldId: game.fieldId,
    gameId: game.id,
    homeScore: game.homeScore,
    homeTeam: game.homeTeam,
    inning: game.inning,
    lastUpdatedAt: now,
    outs: game.status === "live" ? 1 : 0,
    playSurfaceId: game.surfaceId,
    providerStatus: "healthy",
    scoreboardStatus: game.status,
    sourceDetail: "Mock All Sport 5000 serial read-only feed",
    strikes: game.status === "live" ? 1 : 0,
    venueId: crossroadsVenue.id,
    ...overrides,
  };
}

function gameBySurface(surfaceCode: string) {
  const game = crossroadsGames.find((item) => item.surfaceCode === surfaceCode);
  if (!game) {
    throw new Error(`Missing Crossroads game for ${surfaceCode}`);
  }

  return game;
}

export function getMockDaktronicsRawStates(): ScoreboardRawState[] {
  return [
    baseRawState(gameBySurface("6B")),
    baseRawState(gameBySurface("4C"), {
      providerStatus: "healthy",
      scoreboardStatus: "delayed",
      sourceDetail: "Mock All Sport 5000 feed showing delay hold",
    }),
    baseRawState(gameBySurface("8A"), {
      awayScore: 2,
      homeScore: 7,
      inning: "Final",
      providerStatus: "healthy",
      scoreboardStatus: "final",
    }),
    baseRawState(gameBySurface("5A"), {
      lastUpdatedAt: staleTime,
      providerStatus: "offline",
      scoreboardStatus: "offline",
      sourceDetail: "Disconnected read-only feed",
    }),
    baseRawState(gameBySurface("7A"), {
      lastUpdatedAt: staleTime,
      providerStatus: "stale",
      scoreboardStatus: "stale",
      sourceDetail: "Read-only feed last packet is stale",
    }),
  ];
}

export function normalizeScoreboardState(
  state: ScoreboardRawState,
  options: { isOfficial?: boolean; source?: ScoreboardFeedSource } = {},
): NormalizedGameState {
  const source = options.source ?? "daktronics_readonly";
  const indicators = getScoreboardIndicators(state, source);
  const freshness = state.providerStatus;
  const status = state.scoreboardStatus === "offline"
    ? "scoreboard_offline"
    : state.scoreboardStatus === "stale"
      ? "data_stale"
      : state.scoreboardStatus;

  return {
    auditEvents: [
      `${state.sourceDetail} normalized as ${source}.`,
      `Read-only input accepted at ${state.lastUpdatedAt}.`,
      "No physical scoreboard control command was created.",
    ],
    awayScore: state.awayScore,
    awayTeam: state.awayTeam,
    balls: state.balls,
    fieldId: state.fieldId,
    freshness,
    gameId: state.gameId,
    homeScore: state.homeScore,
    homeTeam: state.homeTeam,
    indicators,
    inning: state.inning,
    isOfficial: Boolean(options.isOfficial),
    lastUpdatedAt: state.lastUpdatedAt,
    outs: state.outs,
    playSurfaceId: state.playSurfaceId,
    providerId: "mock_daktronics_readonly",
    source,
    status,
    strikes: state.strikes,
    venueId: state.venueId,
  };
}

export function createMockDaktronicsReadonlyProvider(rawState: ScoreboardRawState): ScoreboardInputProvider {
  return {
    fieldId: rawState.fieldId,
    providerId: "mock_daktronics_readonly",
    playSurfaceId: rawState.playSurfaceId,
    venueId: rawState.venueId,
    async connect() {
      return {
        checkedAt: new Date().toISOString(),
        message: "Mock Daktronics read-only feed connected. No write/control channel exists.",
        providerId: "mock_daktronics_readonly",
        status: rawState.providerStatus === "offline" ? "disconnected" : rawState.providerStatus,
      };
    },
    async disconnect() {
      return {
        checkedAt: new Date().toISOString(),
        message: "Mock Daktronics read-only feed disconnected.",
        providerId: "mock_daktronics_readonly",
        status: "disconnected",
      };
    },
    async healthCheck() {
      return getScoreboardProviderHealth(rawState);
    },
    normalizeScoreboardState(state, options) {
      return normalizeScoreboardState(state, options);
    },
    async readCurrentState() {
      return rawState;
    },
    subscribeToUpdates(callback) {
      callback(rawState);
      return () => undefined;
    },
  };
}

export function getCrossroadsNormalizedGameStates(source: ScoreboardFeedDemoSource = "daktronics") {
  const sourceConfig = scoreboardFeedDemoSources.find((item) => item.id === source) ?? scoreboardFeedDemoSources[0];

  return getMockDaktronicsRawStates().map((state) => normalizeScoreboardState(state, {
    isOfficial: sourceConfig.source === "daktronics_readonly",
    source: sourceConfig.source,
  }));
}

export function getCrossroadsTvBoard(source: ScoreboardFeedDemoSource = "daktronics") {
  const states = getCrossroadsNormalizedGameStates(source);

  return {
    delayed: states.filter((state) => state.status === "delayed"),
    finals: states.filter((state) => state.status === "final"),
    live: states.filter((state) => state.status === "live" || state.status === "warmups"),
    scoreboardHealth: getCrossroadsScoreboardFeedHealth(),
    source: scoreboardFeedDemoSources.find((item) => item.id === source) ?? scoreboardFeedDemoSources[0],
    states,
    upcoming: crossroadsGames.filter((game) => game.status === "scheduled").slice(0, 6),
    venue: crossroadsVenue,
  };
}

export function getCrossroadsScoreboardFeedHealth() {
  return getMockDaktronicsRawStates().map((state) => {
    const normalized = normalizeScoreboardState(state, { isOfficial: true, source: "daktronics_readonly" });
    const field = crossroadsFields.find((item) => item.id === state.fieldId);
    const surface = crossroadsPlaySurfaces.find((item) => item.id === state.playSurfaceId);

    return {
      fieldName: field?.name ?? state.fieldId,
      maintenanceRoute: getScoreboardMaintenanceRequestRoute(state.fieldId),
      normalized,
      providerHealth: getScoreboardProviderHealth(state),
      surfaceCode: surface?.code ?? state.playSurfaceId,
    };
  });
}

export function getScoreboardProviderHealth(state: ScoreboardRawState): ScoreboardProviderHealth {
  const status = state.providerStatus === "offline" ? "offline" : state.providerStatus;

  return {
    checkedAt: new Date().toISOString(),
    message: status === "healthy"
      ? "Read-only scoreboard feed is fresh."
      : status === "stale"
        ? "Read-only scoreboard feed is stale. Confirm manual update path."
        : "Scoreboard feed is offline. Manual GameDay OS entry remains available.",
    providerId: "mock_daktronics_readonly",
    status,
  };
}

export function getScoreboardIndicators(state: ScoreboardRawState, source: ScoreboardFeedSource): ScoreboardFeedIndicator[] {
  const indicators = new Set<ScoreboardFeedIndicator>();

  if (state.scoreboardStatus === "live") indicators.add("live");
  if (state.scoreboardStatus === "warmups") indicators.add("warmups");
  if (state.scoreboardStatus === "delayed") indicators.add("delayed");
  if (state.scoreboardStatus === "final") indicators.add("final");
  if (state.providerStatus === "stale" || state.scoreboardStatus === "stale") indicators.add("data_stale");
  if (state.providerStatus === "offline" || state.scoreboardStatus === "offline") indicators.add("scoreboard_offline");
  if (source === "manual_entry") indicators.add("manual_update");
  if (source === "mock_gamechanger") indicators.add("future_gamechanger_source");

  return [...indicators];
}

export function getScoreboardMaintenanceRequestRoute(fieldId: string) {
  return `/venue/crossroads/maintenance/new?locationType=equipment&locationId=${fieldId}-scoreboard`;
}
