import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  normalizeProviderKey,
  normalizeScoreboardPayload,
  resolveScoreboardAuthority,
  resolveScoreboardSourceAuthority,
  scoreboardAdapterCapabilities,
  validateScoreboardDeviceToken,
} from "../src/lib/scoreboard-adapter-core.ts";
import { DurableLatestStateOutbox } from "../bridge/lib/durable-outbox.mjs";
import { parseFairPlayFrame } from "../bridge/lib/fairplay-parser.mjs";

test("normalizes vendor payload aliases to the shared state contract", () => {
  assert.deepEqual(normalizeScoreboardPayload({
    visitor_score: "3",
    home_score: 5,
    inning: "4",
    inning_half: "BOT",
    balls: 2,
    strikes: 1,
    outs: 1,
    clock: "07:42",
    status: "live",
  }), {
    awayScore: 3,
    balls: 2,
    gameClock: "07:42",
    homeScore: 5,
    inning: 4,
    outs: 1,
    periodLabel: null,
    possession: null,
    shotClock: null,
    status: "live",
    strikes: 1,
    topBottom: "bottom",
  });
});

test("normalizes vendor names without weakening unknown-provider rejection", () => {
  assert.equal(normalizeProviderKey("Fair-Play"), "fairplay");
  assert.equal(normalizeProviderKey("Electro-Mech"), "electro_mech");
  assert.equal(normalizeProviderKey("unapproved"), null);
});

test("requires device-scoped credentials for new providers and bounds legacy fallback to Daktronics", () => {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SCOREBOARD_DEVICE_TOKENS: JSON.stringify({ "field-7-bridge": "scoped-secret" }),
    FAIRPLAY_ADAPTER_TOKEN: "legacy-secret",
  };
  assert.equal(validateScoreboardDeviceToken("scoped-secret", { deviceKey: "field-7-bridge", provider: "fairplay" }, env), true);
  assert.equal(validateScoreboardDeviceToken("legacy-secret", { deviceKey: "field-7-bridge", provider: "fairplay" }, env), false);
  assert.equal(validateScoreboardDeviceToken("legacy-secret", { deviceKey: "unmapped", provider: "fairplay" }, env), false);
  assert.equal(validateScoreboardDeviceToken("legacy-secret", { deviceKey: "unmapped", provider: "daktronics" }, { ...env, DAKTRONICS_ADAPTER_TOKEN: "legacy-secret" }), true);
  assert.equal(validateScoreboardDeviceToken("anything", { deviceKey: "unmapped", provider: "fairplay" }, { ...process.env, SCOREBOARD_DEVICE_TOKENS: "bad json" }), false);
});

test("resolves per-device source authority and fails closed on invalid configuration", () => {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SCOREBOARD_SOURCE_AUTHORITY: JSON.stringify({
      "primary-device": { role: "PRIMARY" },
      "backup-device": { role: "FALLBACK", takeoverAuthorized: true },
    }),
  };
  assert.deepEqual(resolveScoreboardSourceAuthority(["primary-device"], env), { role: "PRIMARY", takeoverAuthorized: false });
  assert.deepEqual(resolveScoreboardSourceAuthority(["backup-device"], env), { role: "FALLBACK", takeoverAuthorized: true });
  assert.equal(resolveScoreboardSourceAuthority(["missing-device"], env), null);
  assert.equal(resolveScoreboardSourceAuthority(["primary-device"], { ...process.env, SCOREBOARD_SOURCE_AUTHORITY: "bad json" }), null);
});

test("prevents echoes and requires explicit fallback takeover", () => {
  assert.deepEqual(resolveScoreboardAuthority({ incomingOriginEventId: "evt-1", projectedOriginEventId: "evt-1", incomingRole: "PRIMARY", incomingStateHash: "a" }), { action: "ignore", reason: "echo" });
  assert.deepEqual(resolveScoreboardAuthority({ incomingRole: "DISPLAY_ONLY", incomingStateHash: "a" }), { action: "ignore", reason: "display_only" });
  assert.deepEqual(resolveScoreboardAuthority({ incomingRole: "FALLBACK", incomingStateHash: "a", takeoverAuthorized: false }), { action: "ignore", reason: "lower_authority" });
  assert.deepEqual(resolveScoreboardAuthority({ incomingRole: "FALLBACK", incomingStateHash: "a", takeoverAuthorized: true }), { action: "accept", reason: "fallback_authorized" });
  assert.deepEqual(resolveScoreboardAuthority({ incomingRole: "PRIMARY", incomingStateHash: "b", primaryStateHash: "a" }), { action: "conflict", reason: "primary_sources_diverged" });
});

test("Fair-Play parser accepts labelled passive VCG output and rejects unknown frames", () => {
  assert.deepEqual(parseFairPlayFrame("VISITOR 03 | HOME 05 | INNING 4 | HALF BOT | BALL 2 | STRIKE 1 | OUT 1 | CLOCK 07:42"), {
    awayScore: 3,
    balls: 2,
    gameClock: "07:42",
    homeScore: 5,
    inning: 4,
    outs: 1,
    status: "active",
    strikes: 1,
    topBottom: "bottom",
  });
  assert.equal(parseFairPlayFrame("unrecognized proprietary frame"), null);
});

test("durable outbox keeps the latest absolute state across restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gameday-scoreboard-"));
  const path = join(directory, "outbox.json");
  const first = new DurableLatestStateOutbox<{ eventId: string; homeScore: number }>(path);
  await first.put({ eventId: "one", homeScore: 1 });
  await first.put({ eventId: "two", homeScore: 2 });
  const restarted = new DurableLatestStateOutbox<{ eventId: string; homeScore: number }>(path);
  assert.deepEqual(await restarted.load(), { eventId: "two", homeScore: 2 });
  assert.equal((await readFile(path, "utf8")).includes('"eventId":"two"'), true);
});

test("write paths remain capability-gated until manufacturer support is verified", () => {
  assert.deepEqual(scoreboardAdapterCapabilities.daktronics.directions, ["input"]);
  assert.deepEqual(scoreboardAdapterCapabilities.fairplay.directions, ["input"]);
  assert.deepEqual(scoreboardAdapterCapabilities.nevco.directions, []);
  assert.deepEqual(scoreboardAdapterCapabilities.electro_mech.directions, []);
});

test("runtime ingestion invokes source-authority resolution before storing a reading", () => {
  const service = readFileSync(new URL("../src/lib/services/daktronics-scoreboard.ts", import.meta.url), "utf8");
  const authorityIndex = service.indexOf("const authorityDecision = resolveScoreboardAuthority");
  const insertIndex = service.indexOf('.from("scoreboard_readings").insert');
  assert.ok(authorityIndex > 0);
  assert.ok(insertIndex > authorityIndex, "authority must accept a reading before persistence");
});
