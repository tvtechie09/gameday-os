import { timingSafeEqual } from "node:crypto";

export type WeatherAutoCheckResult = {
  venueId: string;
  risk: string;
  acted: boolean;
  reason: string;
  status: "completed" | "failed" | "skipped";
};

export function isWeatherCronAuthorized(authorization: string | null, secret: string | undefined) {
  if (!authorization || !secret) return false;
  const actual = Buffer.from(authorization);
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.byteLength === expected.byteLength && timingSafeEqual(actual, expected);
}

export function summarizeWeatherAutoCheck(checked: number, results: WeatherAutoCheckResult[]) {
  const failed = results.filter((result) => result.status === "failed").length;
  return {
    body: { ok: failed === 0, checked, failed, results },
    status: failed === 0 ? 200 : 503,
  };
}

export function summarizeAutomaticStormResponse(
  expectedFields: number,
  summary: { fieldsHeld: number; umpiresTexted: number; alertSent: boolean; autoTriggerRecorded: boolean },
) {
  const failures: string[] = [];
  if (summary.fieldsHeld < expectedFields) failures.push(`held ${summary.fieldsHeld} of ${expectedFields} fields`);
  if (!summary.alertSent) failures.push("alert not created");
  if (!summary.autoTriggerRecorded) failures.push("cooldown not recorded");
  return {
    acted: summary.fieldsHeld > 0 || summary.alertSent,
    reason: failures.length > 0
      ? failures.join(", ")
      : `held ${summary.fieldsHeld} fields, texted ${summary.umpiresTexted} umpires`,
    status: failures.length > 0 ? "failed" as const : "completed" as const,
  };
}
