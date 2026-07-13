import { getLiveWeatherForVenue, LiveWeatherError, type LiveWeatherStatus } from "@/lib/services/weather-live";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getVenues } from "@/lib/services/venues";

// Storm watch: turns live weather into an actionable game-day decision.
// Detection is automatic; the response (flag fields + send the alert) stays
// a one-tap human approval by the GM.

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
};

function assessConditions(weather: LiveWeatherStatus): { risk: StormRiskLevel; reasons: string[] } {
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
  } else if (/rain|drizzle|shower/.test(condition) || /light|moderate/.test(rain)) {
    if (risk === "clear") risk = "caution";
    reasons.push("Rain in the area (" + (weather.rainStatus || weather.condition) + ")");
  }
  if ((weather.windMph ?? 0) >= 30) {
    if (risk === "clear") risk = "caution";
    reasons.push("Wind " + weather.windMph + " mph");
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

  let weather: LiveWeatherStatus | null = null;
  let weatherError: string | null = null;
  try {
    weather = await getLiveWeatherForVenue(venue.id);
  } catch (error) {
    weatherError = error instanceof LiveWeatherError ? error.message : "Live weather is unavailable.";
  }
  const { risk, reasons } = weather ? assessConditions(weather) : { risk: "clear" as StormRiskLevel, reasons: [] };

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
  };
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
