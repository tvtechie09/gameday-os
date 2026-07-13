// Address → coordinates via OpenWeather's Geocoding API. Reuses the same
// OPENWEATHER_API_KEY as the live weather lookup, so no new provider or key.
// Returns null coordinates (never throws to the caller) when the key is
// missing or the address can't be resolved — the manual lat/long fields
// remain the fallback.

export type GeocodeResult =
  | { ok: true; latitude: number; longitude: number; label: string }
  | { ok: false; error: string };

function getOpenWeatherApiKey() {
  return process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY || null;
}

type GeocodeEntry = {
  lat?: number;
  lon?: number;
  name?: string;
  state?: string;
  country?: string;
};

export async function geocodeAddress(query: string): Promise<GeocodeResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter an address to look up." };
  }

  const apiKey = getOpenWeatherApiKey();
  if (!apiKey) {
    return { ok: false, error: "Geocoding needs OPENWEATHER_API_KEY set in Vercel." };
  }

  const url = new URL("https://api.openweathermap.org/geo/1.0/direct");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", "1");
  url.searchParams.set("appid", apiKey);

  let response: Response;
  try {
    response = await fetch(url, { next: { revalidate: 86_400 } });
  } catch (error) {
    console.error("Geocoding request failed", error);
    return { ok: false, error: "Address lookup failed. Try again or enter coordinates manually." };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("Geocoding provider failure", { body: body.slice(0, 300), status: response.status });
    return { ok: false, error: "Address lookup failed. Try again or enter coordinates manually." };
  }

  const results = (await response.json().catch(() => [])) as GeocodeEntry[];
  const match = Array.isArray(results) ? results[0] : undefined;

  if (!match || typeof match.lat !== "number" || typeof match.lon !== "number" || !Number.isFinite(match.lat) || !Number.isFinite(match.lon)) {
    return { ok: false, error: "No coordinates found for that address. Check it or enter them manually." };
  }

  const label = [match.name, match.state, match.country].filter(Boolean).join(", ");
  return { ok: true, latitude: match.lat, longitude: match.lon, label };
}
