import { type CreateWeatherProfileInput, weatherProfileStatuses, weatherSources } from "@/lib/services/weather-profiles";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOptionalNumber(formData: FormData, key: string) {
  const value = readString(formData, key);
  if (!value) return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function readWeatherProfileFormData(formData: FormData): { data: CreateWeatherProfileInput } | { error: string } {
  const venueId = readString(formData, "venue_id");
  const locationName = readString(formData, "location_name");
  const weatherSource = readString(formData, "weather_source");
  const status = readString(formData, "status");

  if (!venueId) {
    return { error: "Venue is required." };
  }

  if (!locationName) {
    return { error: "Location name is required." };
  }

  if (!weatherSources.includes(weatherSource as CreateWeatherProfileInput["weather_source"])) {
    return { error: "Choose a valid weather source." };
  }

  if (!weatherProfileStatuses.includes(status as CreateWeatherProfileInput["status"])) {
    return { error: "Choose a valid weather status." };
  }

  const windThreshold = Number(readString(formData, "wind_threshold_mph"));
  return {
    data: {
      latitude: readOptionalNumber(formData, "latitude"),
      location_name: locationName,
      longitude: readOptionalNumber(formData, "longitude"),
      notes: readString(formData, "notes") || null,
      status: status as CreateWeatherProfileInput["status"],
      venue_id: venueId,
      weather_source: weatherSource as CreateWeatherProfileInput["weather_source"],
      auto_response_mode: readString(formData, "auto_response_mode") === "automatic" ? "automatic" : "manual",
      wind_threshold_mph: Number.isFinite(windThreshold) && windThreshold > 0 ? Math.round(windThreshold) : 30,
      rain_sensitivity: readString(formData, "rain_sensitivity") === "any" ? "any" : "heavy_only",
      notify_parents: formData.get("notify_parents") !== null,
      notify_umpires: formData.get("notify_umpires") !== null,
      notify_staff: formData.get("notify_staff") !== null,
    },
  };
}
