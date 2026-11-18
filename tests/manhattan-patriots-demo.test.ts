import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getPatriotsScenario, isPatriotsView, patriotsDemo, patriotsScenarioKeys } from "../src/lib/demo/manhattan-patriots.ts";

test("Patriots demo exposes every intended audience and rejects unknown views", () => { for (const view of ["gameday", "coach", "family", "venue"]) assert.equal(isPatriotsView(view), true); assert.equal(isPatriotsView("admin"), false); });
test("every scenario has four synthetic division games", () => { const expected = ["Super Lightweight", "Lightweight", "Junior Varsity", "Varsity"]; for (const key of patriotsScenarioKeys) { const scenario = getPatriotsScenario(key); assert.deepEqual(scenario.games.map((game) => game.division), expected); assert.equal(scenario.games.every((game) => game.opponent.includes("synthetic")), true); } });
test("delay and recovery preserve an explicit original kickoff", () => { for (const key of ["delay", "recovery"] as const) assert.equal(getPatriotsScenario(key).games.filter((game) => game.originalKickoff).length, 2); });
test("demo boundaries explicitly prohibit unsupported claims", () => { assert.match(patriotsDemo.sourceBoundary.body, /does not replace registration/i); assert.match(patriotsDemo.privacy, /No real child or family data/i); const component = readFileSync("src/components/patriots/patriots-demo.tsx", "utf8"); assert.match(component, /no live data, messages, payments, devices or controls/i); assert.match(component, /No safety assurance or device control/i); assert.match(component, /Browser-only interaction/i); });
test("the shared venue header stays out of the Patriots presentation", () => { const header = readFileSync("src/components/site-header.tsx", "utf8"); assert.match(header, /pathname\.startsWith\("\/demo\/manhattan-patriots"\)/); });
