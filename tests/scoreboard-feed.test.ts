import assert from "node:assert/strict";
import test from "node:test";
import {
  createMockDaktronicsReadonlyProvider,
  getCrossroadsNormalizedGameStates,
  getCrossroadsTvBoard,
  getMockDaktronicsRawStates,
  normalizeScoreboardState,
} from "../src/lib/scoreboard-feed.ts";
import { acceptScoreboardFeedState, appendGameStateHistoryEvent } from "../src/lib/game-state-engine.ts";

test("mock Daktronics provider normalizes All Sport-style data", () => {
  const rawState = getMockDaktronicsRawStates().find((state) => state.playSurfaceId === "surface-6b");
  assert.ok(rawState);

  const normalized = normalizeScoreboardState(rawState, { isOfficial: true, source: "daktronics_readonly" });

  assert.equal(normalized.source, "daktronics_readonly");
  assert.equal(normalized.isOfficial, true);
  assert.equal(normalized.status, "live");
  assert.equal(normalized.homeTeam, "Cubs");
  assert.equal(normalized.awayTeam, "Saints");
  assert.ok(normalized.indicators.includes("live"));
  assert.ok(normalized.auditEvents.some((event) => event.includes("No physical scoreboard control")));
});

test("read-only provider cannot control a physical scoreboard", async () => {
  const rawState = getMockDaktronicsRawStates()[0];
  const provider = createMockDaktronicsReadonlyProvider(rawState);
  const providerRecord = provider as unknown as Record<string, unknown>;

  assert.equal(providerRecord.writeScore, undefined);
  assert.equal(providerRecord.controlScoreboard, undefined);
  assert.equal(providerRecord.sendCommand, undefined);

  const health = await provider.connect();
  assert.match(health.message, /No write\/control channel exists/);
});

test("Crossroads TV board renders live, final, and delayed game groups", () => {
  const board = getCrossroadsTvBoard("daktronics");

  assert.ok(board.live.some((state) => state.status === "live"));
  assert.ok(board.finals.some((state) => state.status === "final"));
  assert.ok(board.delayed.some((state) => state.status === "delayed"));
});

test("stale and offline states display clearly", () => {
  const states = getCrossroadsNormalizedGameStates("daktronics");

  assert.ok(states.some((state) => state.indicators.includes("data_stale")));
  assert.ok(states.some((state) => state.indicators.includes("scoreboard_offline")));
});

test("Game State Engine accepts Daktronics source and source toggle is pure", () => {
  const daktronics = getCrossroadsNormalizedGameStates("daktronics");
  const gamechanger = getCrossroadsNormalizedGameStates("gamechanger");
  const manual = getCrossroadsNormalizedGameStates("manual");

  assert.equal(daktronics[0].source, "daktronics_readonly");
  assert.equal(gamechanger[0].source, "mock_gamechanger");
  assert.equal(manual[0].source, "manual_entry");
  assert.equal(daktronics[0].gameId, gamechanger[0].gameId);
  assert.equal(daktronics[0].homeScore, manual[0].homeScore);
  assert.ok(gamechanger[0].indicators.includes("future_gamechanger_source"));
  assert.ok(manual[0].indicators.includes("manual_update"));

  const accepted = acceptScoreboardFeedState(getMockDaktronicsRawStates()[0], { isOfficial: true, source: "daktronics_readonly" });
  const withHistory = appendGameStateHistoryEvent(accepted, "Daktronics read-only state accepted by Game State Engine.");
  assert.equal(withHistory.source, "daktronics_readonly");
  assert.ok(withHistory.auditEvents.some((event) => event.includes("Game State Engine")));
});
