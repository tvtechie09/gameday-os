import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isWeatherCronAuthorized, summarizeAutomaticStormResponse, summarizeWeatherAutoCheck, type WeatherAutoCheckResult } from "../src/lib/services/weather-auto-check.ts";

const completed: WeatherAutoCheckResult = {
  venueId: "venue-a",
  risk: "clear",
  acted: false,
  reason: "not severe",
  status: "completed",
};

describe("weather auto-check safety", () => {
  it("accepts only the exact bearer secret", () => {
    assert.equal(isWeatherCronAuthorized("Bearer cron-secret", "cron-secret"), true);
    assert.equal(isWeatherCronAuthorized("cron-secret", "cron-secret"), false);
    assert.equal(isWeatherCronAuthorized("Bearer cron-secret ", "cron-secret"), false);
    assert.equal(isWeatherCronAuthorized(null, "cron-secret"), false);
    assert.equal(isWeatherCronAuthorized("Bearer cron-secret", undefined), false);
  });

  it("reports partial monitoring failures with a retryable server status", () => {
    const result = summarizeWeatherAutoCheck(2, [
      completed,
      { ...completed, venueId: "venue-b", reason: "assessment unavailable", status: "failed" },
    ]);
    assert.equal(result.status, 503);
    assert.deepEqual(result.body, {
      ok: false,
      checked: 2,
      failed: 1,
      results: [completed, { ...completed, venueId: "venue-b", reason: "assessment unavailable", status: "failed" }],
    });
  });

  it("keeps successful and cooldown-only checks successful", () => {
    const result = summarizeWeatherAutoCheck(2, [
      completed,
      { ...completed, venueId: "venue-b", reason: "cooldown", status: "skipped" },
    ]);
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.failed, 0);
  });

  it("reports every incomplete storm side effect", () => {
    assert.deepEqual(summarizeAutomaticStormResponse(3, {
      fieldsHeld: 2,
      umpiresTexted: 1,
      alertSent: false,
      autoTriggerRecorded: false,
    }), {
      acted: true,
      reason: "held 2 of 3 fields, alert not created, cooldown not recorded",
      status: "failed",
    });
    assert.deepEqual(summarizeAutomaticStormResponse(3, {
      fieldsHeld: 3,
      umpiresTexted: 1,
      alertSent: true,
      autoTriggerRecorded: true,
    }), {
      acted: true,
      reason: "held 3 fields, texted 1 umpires",
      status: "completed",
    });
  });

  it("does not accept URL tokens or swallow required automation dependencies", () => {
    const route = readFileSync("src/app/api/weather/auto-check/route.ts", "utf8");
    const profiles = readFileSync("src/lib/services/weather-profiles.ts", "utf8");
    const storm = readFileSync("src/lib/services/storm-watch.ts", "utf8");
    assert.doesNotMatch(route, /searchParams|get\("token"\)/);
    assert.match(route, /getWeatherProfiles\(\{ requireAvailable: true \}\)/);
    assert.match(route, /assessStormRisk\(profile\.venueId, \{ requireAvailable: true \}\)/);
    assert.match(route, /!assessment\.weather/);
    assert.match(route, /summarizeAutomaticStormResponse\(assessment\.fieldCount, summary\)/);
    assert.match(profiles, /isMissingWeatherProfilesTableError\(error\) && !options\.requireAvailable/);
    assert.match(profiles, /markStormAutoTriggered[\s\S]*if \(error\) throw new Error\(error\.message\)/);
    assert.match(storm, /options\.source === "automatic"[\s\S]*\? await getFields\(\)[\s\S]*: await getFields\(\)\.catch/);
  });
});
