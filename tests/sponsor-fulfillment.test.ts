import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProofOfPerformance,
  fulfillmentForGame,
  PACKAGE_TEMPLATES,
  SPONSOR_ASSET_CATALOG,
  isSponsorAssetType,
  type CoveredGame,
} from "../src/lib/services/sponsor-fulfillment-core.ts";

const startedFinal = (id: string): CoveredGame => ({ id, label: `Game ${id}`, startedAt: "2026-07-14T18:00:00.000Z", finalAt: "2026-07-14T19:30:00.000Z" });
const startedOnly = (id: string): CoveredGame => ({ id, label: `Game ${id}`, startedAt: "2026-07-14T18:00:00.000Z", finalAt: null });
const scheduledOnly = (id: string): CoveredGame => ({ id, label: `Game ${id}`, startedAt: null, finalAt: null });

// ---- fulfillmentForGame -----------------------------------------------------

test("fulfillmentForGame: a completed game delivers both started- and final-triggered assets", () => {
  const deliveries = fulfillmentForGame(startedFinal("g1"));
  const byType = new Map(deliveries.map((d) => [d.assetType, d]));
  // started-triggered assets present with their per-game multiplier
  assert.equal(byType.get("scoreboard_logo")?.quantity, SPONSOR_ASSET_CATALOG.scoreboard_logo.perGame);
  assert.equal(byType.get("pregame_announcement")?.quantity, 1);
  // final-triggered asset present, timestamped at final
  assert.equal(byType.get("final_score_graphic")?.occurredAt, "2026-07-14T19:30:00.000Z");
  assert.equal(byType.get("scoreboard_logo")?.occurredAt, "2026-07-14T18:00:00.000Z");
});

test("fulfillmentForGame: a live-but-not-final game delivers only started-triggered assets", () => {
  const deliveries = fulfillmentForGame(startedOnly("g2"));
  assert.ok(deliveries.some((d) => d.assetType === "scoreboard_logo"));
  assert.ok(!deliveries.some((d) => d.assetType === "final_score_graphic"));
});

test("fulfillmentForGame: a game that never started delivers nothing", () => {
  assert.equal(fulfillmentForGame(scheduledOnly("g3")).length, 0);
});

// ---- buildProofOfPerformance ------------------------------------------------

test("buildProofOfPerformance: aggregates delivered vs contracted with delivery rate", () => {
  // 2 completed games -> scoreboard_logo 2*2=4, pregame 2, final 2
  const proof = buildProofOfPerformance({
    contracted: { scoreboard_logo: 4, pregame_announcement: 4, final_score_graphic: 2 },
    games: [startedFinal("g1"), startedFinal("g2")],
  });
  const line = (t: string) => proof.lines.find((l) => l.assetType === t)!;
  assert.equal(line("scoreboard_logo").delivered, 4);
  assert.equal(line("scoreboard_logo").deliveryRate, 1);
  assert.equal(line("pregame_announcement").delivered, 2); // contracted 4 -> 50%
  assert.equal(line("pregame_announcement").deliveryRate, 0.5);
  assert.equal(line("final_score_graphic").delivered, 2);
  assert.equal(proof.gamesConnected, 2);
  assert.equal(proof.gamesCovered, 2);
});

test("buildProofOfPerformance: headline delivery rate is capped at 1 and never divides by zero", () => {
  const over = buildProofOfPerformance({ contracted: { pregame_announcement: 1 }, games: [startedFinal("a"), startedFinal("b")] });
  assert.equal(over.deliveryRate, 1); // 2 delivered vs 1 contracted, capped

  const noContract = buildProofOfPerformance({ contracted: {}, games: [] });
  assert.equal(noContract.deliveryRate, 1);
  assert.equal(noContract.contractedTotal, 0);
});

test("buildProofOfPerformance: an asset delivered but not contracted shows as bonus (contracted 0)", () => {
  const proof = buildProofOfPerformance({ contracted: { pregame_announcement: 2 }, games: [startedFinal("g1")] });
  const bonus = proof.lines.find((l) => l.assetType === "scoreboard_logo");
  assert.ok(bonus, "delivered-but-uncontracted asset appears as a line");
  assert.equal(bonus?.contracted, 0);
  assert.ok((bonus?.delivered ?? 0) > 0);
  // Bonus deliveries must NOT inflate the contracted delivery rate: only the
  // 1 pregame (of 2 contracted) counts -> 50%.
  assert.equal(proof.deliveryRate, 0.5);
});

test("buildProofOfPerformance: folds in digital impressions and CTR; timeline is ordered", () => {
  const proof = buildProofOfPerformance({
    contracted: { scoreboard_logo: 4 },
    games: [startedFinal("g1")],
    impressions: 1000,
    clicks: 50,
  });
  assert.equal(proof.impressions, 1000);
  assert.equal(proof.ctr, 0.05);
  // timeline sorted ascending by occurredAt
  for (let i = 1; i < proof.timeline.length; i++) {
    assert.ok(proof.timeline[i - 1].occurredAt <= proof.timeline[i].occurredAt);
  }
});

// ---- catalog / templates ----------------------------------------------------

test("package templates only reference real asset types", () => {
  for (const template of PACKAGE_TEMPLATES) {
    for (const key of Object.keys(template.contracted)) {
      assert.ok(isSponsorAssetType(key), `${key} is a real asset type`);
    }
  }
});

// ---- make-good + metric basis ----------------------------------------------

test("make-good: recommended when delivery falls outside tolerance, with exact shortfall", () => {
  // Contract 10 scoreboard rotations; one game started -> 2 delivered.
  const proof = buildProofOfPerformance({
    contracted: { scoreboard_logo: 10 },
    games: [startedFinal("g1")],
  });

  const line = proof.lines.find((l) => l.assetType === "scoreboard_logo")!;
  assert.equal(line.contracted, 10);
  assert.equal(line.delivered, 2);
  assert.equal(line.shortfall, 8);
  assert.equal(line.underDelivered, true);

  assert.equal(proof.makeGood.required, true);
  assert.equal(proof.makeGood.totalShortfall, 8);
  assert.equal(proof.makeGood.lines.length, 1);
  assert.match(proof.makeGood.recommendation, /8 make-good placements/);
});

test("make-good: full delivery owes nothing", () => {
  const proof = buildProofOfPerformance({
    contracted: { pregame_announcement: 1 },
    games: [startedFinal("g1")],
  });
  const line = proof.lines.find((l) => l.assetType === "pregame_announcement")!;
  assert.equal(line.shortfall, 0);
  assert.equal(line.underDelivered, false);
  assert.equal(proof.makeGood.required, false);
  assert.equal(proof.makeGood.totalShortfall, 0);
  assert.match(proof.makeGood.recommendation, /Nothing owed/);
});

test("make-good: a tiny shortfall inside tolerance is disclosed but not recommended", () => {
  // 100 contracted, 99 delivered = 99% -> inside the 98% tolerance.
  const games = Array.from({ length: 99 }, (_, i) => startedOnly("g" + i));
  const proof = buildProofOfPerformance({ contracted: { pregame_announcement: 100 }, games });

  assert.equal(proof.makeGood.totalShortfall, 1); // exact shortfall still reported
  assert.equal(proof.makeGood.required, false); // but no make-good recommended
  assert.match(proof.makeGood.recommendation, /inside the 2% tolerance/);
});

test("make-good: bonus (uncontracted) placements can never be owed", () => {
  // field_signage delivered but never sold -> contracted 0, shortfall 0.
  const proof = buildProofOfPerformance({ contracted: {}, games: [startedFinal("g1")] });
  for (const line of proof.lines) {
    assert.equal(line.contracted, 0);
    assert.equal(line.shortfall, 0, `${line.assetType} should not be owed`);
  }
  assert.equal(proof.makeGood.required, false);
  assert.equal(proof.makeGood.totalShortfall, 0);
});

test("basis: placement counts are MODELED, games and digital are VERIFIED", () => {
  const proof = buildProofOfPerformance({
    contracted: { scoreboard_logo: 2 },
    games: [startedFinal("g1")],
    impressions: 500,
    clicks: 10,
  });
  // Placements are a verified milestone x a configured per-game rate — not observed.
  assert.equal(proof.basis.placements, "modeled");
  for (const line of proof.lines) {
    assert.equal(line.basis, "modeled");
  }
  // Game milestones and tracked page events are counted facts.
  assert.equal(proof.basis.games, "verified");
  assert.equal(proof.basis.digital, "verified");
});
