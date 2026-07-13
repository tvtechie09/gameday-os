import assert from "node:assert/strict";
import test from "node:test";
import { assessConditions, buildStormAlertDraft, DEFAULT_ASSESS_OPTIONS, type AssessOptions } from "../src/lib/services/storm-assessment.ts";
import type { LiveWeatherStatus } from "../src/lib/services/weather-live.ts";

function weather(overrides: Partial<LiveWeatherStatus>): LiveWeatherStatus {
  return {
    condition: "clear sky",
    temperatureF: 75,
    windMph: 5,
    humidityPercent: 50,
    rainStatus: "No rain reported",
    lightningStatus: "No lightning signal from provider",
    radarUrl: null,
    source: "OpenWeather",
    fetchedAt: "2026-07-13T12:00:00.000Z",
    ...overrides,
  };
}

const opts = (o: Partial<AssessOptions> = {}): AssessOptions => ({ ...DEFAULT_ASSESS_OPTIONS, ...o });

test("calm, clear weather is clear with no reasons", () => {
  const result = assessConditions(weather({}), opts());
  assert.equal(result.risk, "clear");
  assert.equal(result.reasons.length, 0);
});

test("lightning is always severe", () => {
  const result = assessConditions(weather({ lightningStatus: "Storm risk reported" }), opts());
  assert.equal(result.risk, "severe");
  assert.ok(result.reasons.some((r) => r.includes("Lightning")));
});

test("thunder/tornado/hail in the condition is severe", () => {
  assert.equal(assessConditions(weather({ condition: "thunderstorm" }), opts()).risk, "severe");
  assert.equal(assessConditions(weather({ condition: "tornado warning" }), opts()).risk, "severe");
});

test("heavy rain is caution regardless of sensitivity", () => {
  assert.equal(assessConditions(weather({ rainStatus: "Heavy rain" }), opts({ rainSensitivity: "heavy_only" })).risk, "caution");
});

test("light rain triggers caution only when sensitivity is 'any'", () => {
  const light = weather({ condition: "light rain", rainStatus: "Rain possible" });
  assert.equal(assessConditions(light, opts({ rainSensitivity: "heavy_only" })).risk, "clear");
  assert.equal(assessConditions(light, opts({ rainSensitivity: "any" })).risk, "caution");
});

test("wind crosses the configured threshold, not a fixed 30", () => {
  assert.equal(assessConditions(weather({ windMph: 26 }), opts({ windThresholdMph: 25 })).risk, "caution");
  assert.equal(assessConditions(weather({ windMph: 20 }), opts({ windThresholdMph: 25 })).risk, "clear");
  // Default threshold is 30
  assert.equal(assessConditions(weather({ windMph: 30 }), opts()).risk, "caution");
  assert.equal(assessConditions(weather({ windMph: 29 }), opts()).risk, "clear");
});

test("severe (lightning) is not downgraded by a wind caution", () => {
  const result = assessConditions(weather({ lightningStatus: "Storm risk reported", windMph: 40 }), opts());
  assert.equal(result.risk, "severe");
});

test("alert draft: severe copy vs advisory copy, with reasons", () => {
  const severe = buildStormAlertDraft({ risk: "severe", venueName: "Wintrust", reasons: ["Lightning: Storm risk reported"] });
  assert.equal(severe.title, "Weather: clear the fields");
  assert.ok(severe.message.includes("Wintrust"));
  assert.ok(severe.message.includes("on hold"));
  assert.ok(severe.message.includes("(Lightning: Storm risk reported)"));

  const advisory = buildStormAlertDraft({ risk: "caution", venueName: "Wintrust", reasons: [] });
  assert.equal(advisory.title, "Weather advisory");
  assert.ok(advisory.message.includes("possible delays"));
  assert.ok(!advisory.message.includes("()")); // no empty reason parens
});
