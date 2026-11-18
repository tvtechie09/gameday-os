import { NextResponse } from "next/server";
import { getWeatherProfiles } from "@/lib/services/weather-profiles";
import { assessStormRisk, executeStormResponse } from "@/lib/services/storm-watch";
import { automationActorUserId } from "@/lib/access/automation-actor";
import { isWeatherCronAuthorized, summarizeAutomaticStormResponse, summarizeWeatherAutoCheck, type WeatherAutoCheckResult } from "@/lib/services/weather-auto-check";

export const dynamic = "force-dynamic";

// Automatic storm response. Vercel Cron (see vercel.json) hits this on a schedule
// with Authorization: Bearer ${CRON_SECRET}. It scans venues whose weather
// profile is in "automatic" mode and, when live conditions are SEVERE and the
// venue hasn't already been auto-triggered in the last 30 minutes, suspends
// games + sends the alert (and texts umpires when opted in). Manual-mode venues
// are never touched here — their director still taps the storm-watch page.
const RETRIGGER_COOLDOWN_MS = 30 * 60 * 1000;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET || process.env.WEATHER_CRON_SECRET;
  return isWeatherCronAuthorized(request.headers.get("authorization"), secret);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401, headers: { "cache-control": "no-store" } });
  }

  const now = Date.now();
  let profiles;
  try {
    profiles = (await getWeatherProfiles({ requireAvailable: true }))
      .filter((profile) => profile.autoResponseMode === "automatic");
  } catch {
    console.error("Weather auto-check could not load weather profiles.");
    return NextResponse.json(
      { ok: false, checked: 0, failed: 1, results: [], error: "Weather profiles unavailable." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
  const results: WeatherAutoCheckResult[] = [];

  for (const profile of profiles) {
    const lastTriggered = profile.autoLastTriggeredAt ? new Date(profile.autoLastTriggeredAt).getTime() : 0;
    if (now - lastTriggered < RETRIGGER_COOLDOWN_MS) {
      results.push({ venueId: profile.venueId, risk: "-", acted: false, reason: "cooldown", status: "skipped" });
      continue;
    }
    const assessment = await assessStormRisk(profile.venueId, { requireAvailable: true }).catch(() => null);
    if (!assessment || !assessment.profile || !assessment.weather) {
      console.error(`Weather auto-check assessment unavailable for venue ${profile.venueId}.`);
      results.push({ venueId: profile.venueId, risk: "-", acted: false, reason: "assessment unavailable", status: "failed" });
      continue;
    }
    if (assessment.risk !== "severe") {
      results.push({ venueId: profile.venueId, risk: assessment.risk, acted: false, reason: "not severe", status: "completed" });
      continue;
    }
    const summary = await executeStormResponse(assessment, { severe: true, source: "automatic", actorUserId: automationActorUserId })
      .catch(() => null);
    if (!summary) {
      console.error(`Weather auto-check storm response failed for venue ${profile.venueId}.`);
      results.push({ venueId: profile.venueId, risk: "severe", acted: false, reason: "storm response failed", status: "failed" });
      continue;
    }
    // "acted" used to be hardcoded true, so a run that held zero fields still
    // reported success. Report what actually happened.
    const outcome = summarizeAutomaticStormResponse(assessment.fieldCount, summary);
    if (outcome.status === "failed") {
      console.error(`Weather auto-check storm response incomplete for venue ${profile.venueId}: ${outcome.reason}.`);
    }
    results.push({
      venueId: profile.venueId,
      risk: "severe",
      ...outcome,
    });
  }

  const response = summarizeWeatherAutoCheck(profiles.length, results);
  return NextResponse.json(response.body, { status: response.status, headers: { "cache-control": "no-store" } });
}
