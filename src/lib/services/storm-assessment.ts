import type { LiveWeatherStatus } from "@/lib/services/weather-live";
import type { RainSensitivity } from "@/lib/types";

// Pure storm-risk assessment: live weather + per-venue thresholds -> risk level
// and human-readable reasons. Kept dependency-free (type-only imports) so it is
// unit-testable in isolation from the DB-backed storm-watch service.

export type StormRiskLevel = "clear" | "caution" | "severe";
export type AssessOptions = { windThresholdMph: number; rainSensitivity: RainSensitivity };

export const DEFAULT_ASSESS_OPTIONS: AssessOptions = { windThresholdMph: 30, rainSensitivity: "heavy_only" };

export function assessConditions(weather: LiveWeatherStatus, options: AssessOptions): { risk: StormRiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  let risk: StormRiskLevel = "clear";
  const lightning = (weather.lightningStatus || "").toLowerCase();
  const rain = (weather.rainStatus || "").toLowerCase();
  const condition = (weather.condition || "").toLowerCase();
  // A lightning THREAT, not the provider's "no signal" message. weather-live
  // reports "Storm risk reported" for a threat and "No lightning signal from
  // provider" otherwise, so treat anything that isn't a negative/absent phrase
  // as severe.
  if (lightning && !/^(no |none|clear|unknown)/.test(lightning)) {
    risk = "severe";
    reasons.push("Lightning: " + weather.lightningStatus);
  }
  if (/thunder|storm|tornado|hail/.test(condition)) {
    risk = "severe";
    reasons.push("Conditions: " + weather.condition);
  }
  if (/heavy|extreme/.test(rain)) {
    if (risk === "clear") risk = "caution";
    reasons.push("Rain: " + weather.rainStatus);
  } else if (options.rainSensitivity === "any" && (/rain|drizzle|shower/.test(condition) || /light|moderate/.test(rain))) {
    if (risk === "clear") risk = "caution";
    reasons.push("Rain in the area (" + (weather.rainStatus || weather.condition) + ")");
  }
  if ((weather.windMph ?? 0) >= options.windThresholdMph) {
    if (risk === "clear") risk = "caution";
    reasons.push("Wind " + weather.windMph + " mph (threshold " + options.windThresholdMph + ")");
  }
  return { risk, reasons };
}

// Composes the public weather alert copy from an assessment. Pure.
export function buildStormAlertDraft(input: { risk: StormRiskLevel; venueName: string; reasons: string[] }): { title: string; message: string } {
  const severe = input.risk === "severe";
  return {
    title: severe ? "Weather: clear the fields" : "Weather advisory",
    message: (severe
      ? "Lightning/severe weather detected near " + input.venueName + ". All fields are on hold — clear the fields and take shelter. "
      : "Weather is deteriorating near " + input.venueName + ". Expect possible delays. ")
      + (input.reasons.length ? "(" + input.reasons.join("; ") + ") " : "")
      + "Watch this page for the all-clear.",
  };
}
