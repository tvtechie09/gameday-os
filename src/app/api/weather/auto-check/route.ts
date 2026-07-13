import { NextResponse } from "next/server";
import { getWeatherProfiles } from "@/lib/services/weather-profiles";
import { assessStormRisk, executeStormResponse } from "@/lib/services/storm-watch";

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
  if (!secret) return false; // Fail closed: no open trigger endpoint.
  const header = request.headers.get("authorization") || "";
  if (header === "Bearer " + secret) return true;
  const token = new URL(request.url).searchParams.get("token");
  return token === secret;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401, headers: { "cache-control": "no-store" } });
  }

  const now = Date.now();
  const profiles = (await getWeatherProfiles().catch(() => [])).filter((profile) => profile.autoResponseMode === "automatic");
  const results: Array<{ venueId: string; risk: string; acted: boolean; reason: string }> = [];

  for (const profile of profiles) {
    const lastTriggered = profile.autoLastTriggeredAt ? new Date(profile.autoLastTriggeredAt).getTime() : 0;
    if (now - lastTriggered < RETRIGGER_COOLDOWN_MS) {
      results.push({ venueId: profile.venueId, risk: "-", acted: false, reason: "cooldown" });
      continue;
    }
    const assessment = await assessStormRisk(profile.venueId).catch(() => null);
    if (!assessment) {
      results.push({ venueId: profile.venueId, risk: "-", acted: false, reason: "no assessment" });
      continue;
    }
    if (assessment.risk !== "severe") {
      results.push({ venueId: profile.venueId, risk: assessment.risk, acted: false, reason: "not severe" });
      continue;
    }
    const summary = await executeStormResponse(assessment, { severe: true, source: "automatic" });
    results.push({ venueId: profile.venueId, risk: "severe", acted: true, reason: "held " + summary.fieldsHeld + " fields, texted " + summary.umpiresTexted + " umpires" });
  }

  return NextResponse.json({ ok: true, checked: profiles.length, results }, { headers: { "cache-control": "no-store" } });
}
