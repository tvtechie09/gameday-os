import assert from "node:assert/strict";
import test from "node:test";
import { roundRobinPairings, scheduleRoundRobin } from "../src/lib/round-robin.ts";

const teams = (names: string[]) => names.map((name) => ({ name }));

test("every team plays every other team exactly once", () => {
  const rounds = roundRobinPairings(teams(["A", "B", "C", "D", "E", "F"]));
  const seen = new Set<string>();
  for (const round of rounds) {
    const inRound = new Set<string>();
    for (const [home, away] of round) {
      const key = [home.name, away.name].sort().join("-");
      assert.ok(!seen.has(key), "duplicate matchup " + key);
      seen.add(key);
      assert.ok(!inRound.has(home.name) && !inRound.has(away.name), "team plays twice in a round");
      inRound.add(home.name);
      inRound.add(away.name);
    }
  }
  assert.equal(seen.size, 15);
});

test("odd team counts get a bye, home/away stays roughly balanced", () => {
  const rounds = roundRobinPairings(teams(["A", "B", "C", "D", "E"]));
  const played = new Map<string, number>();
  const homeCount = new Map<string, number>();
  for (const round of rounds) for (const [home, away] of round) {
    played.set(home.name, (played.get(home.name) ?? 0) + 1);
    played.set(away.name, (played.get(away.name) ?? 0) + 1);
    homeCount.set(home.name, (homeCount.get(home.name) ?? 0) + 1);
  }
  for (const name of ["A", "B", "C", "D", "E"]) {
    assert.equal(played.get(name), 4);
    const homes = homeCount.get(name) ?? 0;
    assert.ok(homes >= 1 && homes <= 3, name + " home games out of balance: " + homes);
  }
});

test("scheduling fills fields per slot and reports overflow", () => {
  const fields = [{ id: "f1", name: "Field 1" }, { id: "f2", name: "Field 2" }];
  const { matches, unscheduled } = scheduleRoundRobin(teams(["A", "B", "C", "D"]), fields, ["2026-09-12"], { startTime: "9:00 AM", endTime: "12:00 PM", gameMinutes: 90 });
  // 4 teams => 3 rounds x 2 games = 6 games; capacity 2 slots x 2 fields = 4.
  assert.equal(matches.length, 4);
  assert.equal(unscheduled, 2);
  // no team twice in the same slot
  const bySlot = new Map<string, Set<string>>();
  for (const match of matches) {
    const set = bySlot.get(match.startTime) ?? new Set<string>();
    assert.ok(!set.has(match.home.name) && !set.has(match.away.name));
    set.add(match.home.name); set.add(match.away.name);
    bySlot.set(match.startTime, set);
  }
});
