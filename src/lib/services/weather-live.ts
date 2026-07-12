import { getVenue } from "@/lib/services/venues";
import { getWeatherProfilesByVenueId } from "@/lib/services/weather-profiles";
import type { WeatherProfile } from "@/lib/types";

export type LiveWeatherStatus = {
  condition: string;
  temperatureF: number | null;
  windMph: number | null;
  humidityPercent: number | null;
  rainStatus: string;
  lightningStatus: string;
  radarUrl: string | null;
  source: string;
  fetchedAt: string;
};

export type LiveWeatherErrorCode = "missing_venue_id" | "venue_not_found" | "missing_coordinates" | "missing_api_key" | "provider_failure";

export class LiveWeatherError extends Error {
  code: LiveWeatherErrorCode;
  status: number;

  constructor(code: LiveWeatherErrorCode, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type WeatherCoordinates = {
  latitude: number;
  longitude: number;
  profile: WeatherProfile | null;
};

type OpenWeatherResponse = {
  weather?: Array<{ description?: string; main?: string }>;
  main?: { temp?: number; humidity?: number };
  wind?: { speed?: number };
  rain?: Record<string, number>;
};

function isFiniteCoordinate(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value);
}

function getOpenWeatherApiKey() {
  return process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY || null;
}

function getProviderName(profile: WeatherProfile | null) {
  const configuredProvider = process.env.WEATHER_PROVIDER?.trim().toLowerCase();

  if (configuredProvider) {
    return configuredProvider;
  }

  if (profile?.weatherSource === "national_weather_service") {
    return "national_weather_service";
  }

  return "openweather";
}

function getRainStatus(data: OpenWeatherResponse) {
  if (data.rain && Object.values(data.rain).some((value) => value > 0)) {
    return "Rain detected nearby";
  }

  const condition = `${data.weather?.[0]?.main ?? ""} ${data.weather?.[0]?.description ?? ""}`.toLowerCase();
  if (condition.includes("rain") || condition.includes("storm") || condition.includes("drizzle")) {
    return "Rain possible";
  }

  return "No rain reported";
}

function getLightningStatus(data: OpenWeatherResponse) {
  const condition = `${data.weather?.[0]?.main ?? ""} ${data.weather?.[0]?.description ?? ""}`.toLowerCase();
  return condition.includes("thunder") || condition.includes("storm") ? "Storm risk reported" : "No lightning signal from provider";
}

async function resolveWeatherCoordinates(venueId: string): Promise<WeatherCoordinates> {
  const venue = await getVenue(venueId);

  if (!venue) {
    console.error("Weather API venue not found", { venueId });
    throw new LiveWeatherError("venue_not_found", "Venue was not found.", 404);
  }

  const profiles = await getWeatherProfilesByVenueId(venueId);
  const profile = profiles.find((item) => isFiniteCoordinate(item.latitude) && isFiniteCoordinate(item.longitude)) ?? null;

  const latitude = profile?.latitude;
  const longitude = profile?.longitude;

  if (!profile || !isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) {
    console.error("Weather API missing venue coordinates", {
      address: venue.address,
      city: venue.city ?? null,
      profileCount: profiles.length,
      state: venue.state ?? null,
      venueId,
    });
    throw new LiveWeatherError(
      "missing_coordinates",
      "Weather coordinates are missing. Add latitude and longitude to the venue weather profile.",
      422,
    );
  }

  return {
    latitude: Number(latitude),
    longitude: Number(longitude),
    profile,
  };
}

async function fetchOpenWeather(coordinates: WeatherCoordinates): Promise<LiveWeatherStatus> {
  const apiKey = getOpenWeatherApiKey();

  if (!apiKey) {
    console.error("Weather API key missing", { expected: ["OPENWEATHER_API_KEY", "WEATHER_API_KEY"] });
    throw new LiveWeatherError(
      "missing_api_key",
      "Weather provider API key is missing. Set OPENWEATHER_API_KEY in Vercel Production and Preview.",
      500,
    );
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("lat", String(coordinates.latitude));
  url.searchParams.set("lon", String(coordinates.longitude));
  url.searchParams.set("units", "imperial");
  url.searchParams.set("appid", apiKey);

  const response = await fetch(url, { next: { revalidate: 300 } });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("OpenWeather provider failure", { body: body.slice(0, 500), status: response.status });
    throw new LiveWeatherError("provider_failure", "Weather provider request failed.", 502);
  }

  const data = await response.json() as OpenWeatherResponse;
  const description = data.weather?.[0]?.description ?? data.weather?.[0]?.main ?? "Current condition unavailable";

  return {
    condition: description,
    fetchedAt: new Date().toISOString(),
    humidityPercent: typeof data.main?.humidity === "number" ? data.main.humidity : null,
    lightningStatus: getLightningStatus(data),
    radarUrl: `https://openweathermap.org/weathermap?basemap=map&cities=false&layer=radar&lat=${coordinates.latitude}&lon=${coordinates.longitude}&zoom=9`,
    rainStatus: getRainStatus(data),
    source: "OpenWeather",
    temperatureF: typeof data.main?.temp === "number" ? Math.round(data.main.temp) : null,
    windMph: typeof data.wind?.speed === "number" ? Math.round(data.wind.speed) : null,
  };
}

async function fetchNationalWeatherService(coordinates: WeatherCoordinates): Promise<LiveWeatherStatus> {
  const pointsResponse = await fetch(`https://api.weather.gov/points/${coordinates.latitude},${coordinates.longitude}`, {
    headers: { "User-Agent": "GameDayOS/1.0 (venue weather profile)" },
    next: { revalidate: 300 },
  });

  if (!pointsResponse.ok) {
    const body = await pointsResponse.text().catch(() => "");
    console.error("NWS points provider failure", { body: body.slice(0, 500), status: pointsResponse.status });
    throw new LiveWeatherError("provider_failure", "National Weather Service point lookup failed.", 502);
  }

  const points = await pointsResponse.json() as { properties?: { forecast?: string; radarStation?: string } };
  const forecastUrl = points.properties?.forecast;

  if (!forecastUrl) {
    console.error("NWS forecast URL missing", { latitude: coordinates.latitude, longitude: coordinates.longitude });
    throw new LiveWeatherError("provider_failure", "National Weather Service forecast URL was missing.", 502);
  }

  const forecastResponse = await fetch(forecastUrl, {
    headers: { "User-Agent": "GameDayOS/1.0 (venue weather profile)" },
    next: { revalidate: 300 },
  });

  if (!forecastResponse.ok) {
    const body = await forecastResponse.text().catch(() => "");
    console.error("NWS forecast provider failure", { body: body.slice(0, 500), status: forecastResponse.status });
    throw new LiveWeatherError("provider_failure", "National Weather Service forecast request failed.", 502);
  }

  const forecast = await forecastResponse.json() as {
    properties?: {
      periods?: Array<{ detailedForecast?: string; shortForecast?: string; temperature?: number; windSpeed?: string }>;
    };
  };
  const period = forecast.properties?.periods?.[0];
  const condition = period?.shortForecast ?? "Current condition unavailable";
  const detailed = `${condition} ${period?.detailedForecast ?? ""}`.toLowerCase();

  return {
    condition,
    fetchedAt: new Date().toISOString(),
    humidityPercent: null,
    lightningStatus: detailed.includes("thunder") || detailed.includes("storm") ? "Storm risk reported" : "No lightning signal from provider",
    radarUrl: points.properties?.radarStation ? `https://radar.weather.gov/station/${points.properties.radarStation}/standard` : "https://radar.weather.gov/",
    rainStatus: detailed.includes("rain") || detailed.includes("shower") ? "Rain possible" : "No rain reported",
    source: "National Weather Service",
    temperatureF: typeof period?.temperature === "number" ? period.temperature : null,
    windMph: period?.windSpeed ? Number.parseInt(period.windSpeed, 10) || null : null,
  };
}

export async function getLiveWeatherForVenue(venueId: string): Promise<LiveWeatherStatus> {
  const trimmedVenueId = venueId.trim();

  if (!trimmedVenueId) {
    console.error("Weather API missing venue ID");
    throw new LiveWeatherError("missing_venue_id", "venueId is required.", 400);
  }

  const coordinates = await resolveWeatherCoordinates(trimmedVenueId);
  const provider = getProviderName(coordinates.profile);

  if (provider === "national_weather_service" || provider === "nws") {
    return fetchNationalWeatherService(coordinates);
  }

  if (provider === "openweather" || provider === "openweathermap") {
    return fetchOpenWeather(coordinates);
  }

  console.error("Unsupported weather provider", { provider, venueId: trimmedVenueId });
  throw new LiveWeatherError("provider_failure", `Unsupported weather provider: ${provider}.`, 500);
}
