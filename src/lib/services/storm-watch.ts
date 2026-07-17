import { getLiveWeatherForVenue, LiveWeatherError, type LiveWeatherStatus } from "@/lib/services/weather-live";
import { getFields, updateFieldStatus } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getVenues } from "@/lib/services/venues";
import { getOfficialsForSessions } from "@/lib/services/officials";
import { createAlert } from "@/lib/services/alerts";
import { getWeatherProfilesByVenueId, markStormAutoTriggered } from "@/lib/services/weather-profiles";
import { normalizePhone, sendSms } from "@/lib/services/sms";
import { assessConditions, buildStormAlertDraft, DEFAULT_ASSESS_OPTIONS, type AssessOptions, type StormRiskLevel } from "@/lib/services/storm-assessment";
import type { WeatherProfile } from "@/lib/types";

// Storm watch: turns live weather into an actionable game-day decision.
// Detection is automatic; thresholds and whether the response is a human tap
// or fully automatic are configured per venue on its weather profile.

export type { StormRiskLevel };

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
  // actorUserId is REQUIRED, not optional. updateFieldStatus runs a venue-scoped
  // requirePermission; when this was omitted every field hold threw and the
  // catch below reported it as "not held", so fieldsHeld was always 0 while the
  // alert still went out -- the response looked like it worked. Making it
  // required means a caller that forgets fails the typecheck instead of failing
  // silently in a storm. Automatic callers pass automationActorUserId.
  options: { severe: boolean; source: "manual" | "automatic"; actorUserId: string }
): Promise<StormResponseSummary> {
  const severe = options.severe;
  const draft = buildStormAlertDraft({ ...assessment, risk: severe ? "severe" : "caution" });
  const now = new Date();
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  let fieldsHeld = 0;
  if (severe) {
    const fields = await getFields().catch(() => []);
    for (const field of fields.filter((item) => item.venueId === assessment.venueId)) {
      const ok = await updateFieldStatus(field.id, "delayed", options.actorUserId)
        .then(() => true)
        .catch((error) => {
          // A field we could not hold during a severe storm is the loudest thing
          // this system can fail at -- never let it pass unlogged.
          console.error(`Storm response failed to hold field ${field.id} at venue ${assessment.venueId}`, error);
          return false;
        });
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
    // One text per person: an umpire on several of the next few games would
    // otherwise get the same message once per game. Dedupe on normalized phone.
    const recipients = new Map<string, string>();
    for (const official of officials) {
      if (!official.officialPhone) continue;
      const key = normalizePhone(official.officialPhone) ?? official.officialPhone;
      if (!recipients.has(key)) recipients.set(key, official.officialPhone);
    }
    const smsBody = (severe
      ? "GameDay OS: games at " + assessment.venueName + " are ON HOLD due to weather. Do not start play; watch for the all-clear."
      : "GameDay OS: weather advisory for " + assessment.venueName + ". Possible delays — stay alert for updates.");
    for (const phone of recipients.values()) {
      const result = await sendSms(phone, smsBody);
      if (result.sent) umpiresTexted += 1;
      else umpiresSkipped += 1;
    }
  }

  if (options.source === "automatic" && assessment.profile) {
    await markStormAutoTriggered(assessment.profile.id, now.toISOString()).catch(() => undefined);
  }

  return { severe, fieldsHeld, umpiresTexted, umpiresSkipped, alertSent };
}

