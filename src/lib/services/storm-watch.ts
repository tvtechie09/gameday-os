import { getLiveWeatherForVenue, LiveWeatherError, type LiveWeatherStatus } from "@/lib/services/weather-live";
import { getFields, updateFieldStatus } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getVenues } from "@/lib/services/venues";
import { getOfficialsForSessions } from "@/lib/services/officials";
import { createAlert } from "@/lib/services/alerts";
import { getWeatherProfilesByVenueId, markStormAutoTriggered } from "@/lib/services/weather-profiles";
import { sendSms } from "@/lib/services/sms";
import type { RainSensitivity, WeatherProfile } from "@/lib/types";

// Storm watch: turns live weather into an actionable game-day decision.
// Detection is automatic; thresholds and whether the response is a human tap
// or fully automatic are configured per venue on its weather profile.

export type StormRiskLevel = "clear" | "caution" | "severe";

export type StormAssessment = {
  venueId: string;
  venueName: string;
  risk: StormRiskLevel;
  reasons: string[];
  weather: LiveWeatherStatus | null;
  weatherError: string | null;
  upcomingGames: Array<{ id: string; label: string; startTime: string; fieldName: string }>;
  fieldCount: number;
  profile: WeatherProfile | null;
};

type AssessOptions = { windThresholdMph: number; rainSensitivity: RainSensitivity };

const DEFAULT_ASSESS_OPTIONS: AssessOptions = { windThresholdMph: 30, rainSensitivity: "heavy_only" };

function assessConditions(weather: LiveWeatherStatus, options: AssessOptions): { risk: StormRiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  let risk: StormRiskLevel = "clear";
  const lightning = (weather.lightningStatus || "").toLowerCase();
  const rain = (weather.rainStatus || "").toLowerCase();
  const condition = (weather.condition || "").toLowerCase();
  if (lightning && !["none", "clear", "no lightning", "unknown", ""].includes(lightning)) {
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

export async function assessStormRisk(venueId?: string): Promise<StormAssessment | null> {
  const [venues, allFields] = await Promise.all([getVenues().catch(() => []), getFields().catch(() => [])]);
  const fieldCountByVenue = new Map<string, number>();
  for (const field of allFields) fieldCountByVenue.set(field.venueId, (fieldCountByVenue.get(field.venueId) ?? 0) + 1);
  const venue = venueId
    ? venues.find((item) => item.id === venueId)
    : [...venues].sort((a, b) => (fieldCountByVenue.get(b.id) ?? 0) - (fieldCountByVenue.get(a.id) ?? 0))[0];
  if (!venue) return null;

  const profile = (await getWeatherProfilesByVenueId(venue.id).catch(() => []))[0] ?? null;
  const options: AssessOptions = profile
    ? { windThresholdMph: profile.windThresholdMph, rainSensitivity: profile.rainSensitivity }
    : DEFAULT_ASSESS_OPTIONS;

  let weather: LiveWeatherStatus | null = null;
  let weatherError: string | null = null;
  try {
    weather = await getLiveWeatherForVenue(venue.id);
  } catch (error) {
    weatherError = error instanceof LiveWeatherError ? error.message : "Live weather is unavailable.";
  }
  const { risk, reasons } = weather ? assessConditions(weather, options) : { risk: "clear" as StormRiskLevel, reasons: [] };

  const sessions = await getSessions().catch(() => []);
  const venueFields = allFields.filter((field) => field.venueId === venue.id);
  const fieldIds = new Set(venueFields.map((field) => field.id));
  const fieldNames = new Map(venueFields.map((field) => [field.id, field.name]));
  const now = Date.now();
  const upcomingGames = sessions
    .filter((session) => fieldIds.has(session.fieldId) && new Date(session.startTime).getTime() > now - 2 * 60 * 60 * 1000 && new Date(session.startTime).getTime() < now + 6 * 60 * 60 * 1000)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 20)
    .map((session) => ({
      id: session.id,
      label: session.title || session.homeTeam + " vs " + session.awayTeam,
      startTime: session.startTime,
      fieldName: fieldNames.get(session.fieldId) || "Field",
    }));

  return {
    venueId: venue.id,
    venueName: venue.name,
    risk,
    reasons,
    weather,
    weatherError,
    upcomingGames,
    fieldCount: venueFields.length,
    profile,
  };
}

export type StormResponseSummary = {
  severe: boolean;
  fieldsHeld: number;
  umpiresTexted: number;
  umpiresSkipped: number;
  alertSent: boolean;
};

// Shared storm response, used by both the manual one-tap page and the automatic
// cron. When severe, every field at the venue is flagged delayed; an urgent (or
// advisory) public weather alert is created; and, when the venue opts in,
// assigned umpires for the next few hours of games get a text (provider-ready:
// no-op without Twilio). Best-effort throughout — a failed text never blocks
// the field hold or the public alert.
export async function executeStormResponse(
  assessment: StormAssessment,
  options: { severe: boolean; source: "manual" | "automatic" }
): Promise<StormResponseSummary> {
  const severe = options.severe;
  const draft = buildStormAlertDraft({ ...assessment, risk: severe ? "severe" : "caution" });
  const now = new Date();
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  let fieldsHeld = 0;
  if (severe) {
    const fields = await getFields().catch(() => []);
    for (const field of fields.filter((item) => item.venueId === assessment.venueId)) {
      const ok = await updateFieldStatus(field.id, "delayed").then(() => true).catch(() => false);
      if (ok) fieldsHeld += 1;
    }
  }

  let alertSent = false;
  try {
    await createAlert({
      title: draft.title,
      message: draft.message,
      alert_type: "weather",
      alert_scope: "venue",
      alert_priority: severe ? "urgent" : "high",
      alert_visibility: "public",
      venue_id: assessment.venueId,
      start_time: now.toISOString(),
      end_time: end.toISOString(),
      is_active: true,
    });
    alertSent = true;
  } catch (error) {
    console.error("Storm response: alert creation failed", error);
  }

  let umpiresTexted = 0;
  let umpiresSkipped = 0;
  if (assessment.profile?.notifyUmpires && assessment.upcomingGames.length) {
    const officials = await getOfficialsForSessions(assessment.upcomingGames.map((game) => game.id)).catch(() => []);
    const withPhone = officials.filter((official) => official.officialPhone);
    const smsBody = (severe
      ? "GameDay OS: games at " + assessment.venueName + " are ON HOLD due to weather. Do not start play; watch for the all-clear."
      : "GameDay OS: weather advisory for " + assessment.venueName + ". Possible delays — stay alert for updates.");
    for (const official of withPhone) {
      const result = await sendSms(official.officialPhone as string, smsBody);
      if (result.sent) umpiresTexted += 1;
      else umpiresSkipped += 1;
    }
  }

  if (options.source === "automatic" && assessment.profile) {
    await markStormAutoTriggered(assessment.profile.id, now.toISOString()).catch(() => undefined);
  }

  return { severe, fieldsHeld, umpiresTexted, umpiresSkipped, alertSent };
}

export function buildStormAlertDraft(assessment: StormAssessment): { title: string; message: string } {
  const severe = assessment.risk === "severe";
  return {
    title: severe ? "Weather: clear the fields" : "Weather advisory",
    message: (severe
      ? "Lightning/severe weather detected near " + assessment.venueName + ". All fields are on hold — clear the fields and take shelter. "
      : "Weather is deteriorating near " + assessment.venueName + ". Expect possible delays. ")
      + (assessment.reasons.length ? "(" + assessment.reasons.join("; ") + ") " : "")
      + "Watch this page for the all-clear.",
  };
}
