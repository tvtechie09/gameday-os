// Address → coordinates via OpenWeather's Geocoding API. Reuses the same
// OPENWEATHER_API_KEY as the live weather lookup, so no new provider or key.
// Never throws to the caller: on a missing key or an unresolvable address it
// returns { ok: false }, and the manual lat/long fields remain the fallback.
//
// OpenWeather's geocoder is weak on full street addresses (it wants
// "city,state,country" or a ZIP), and a venue's stored address often already
// contains the city/state/ZIP — so a naive "address, city, state" join produces
// a garbled query it can't parse. We therefore try, in order: the US ZIP if one
// is present (most reliable), the raw query, then a cleaned city/state query
// with the street line dropped. Weather is regional, so city/ZIP-level accuracy
// is plenty.

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

function isCoord(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function fetchJson(url: URL): Promise<unknown | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 86_400 } });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("Geocoding provider failure", { body: body.slice(0, 300), status: response.status });
      return null;
    }
    return await response.json().catch(() => null);
  } catch (error) {
    console.error("Geocoding request failed", error);
    return null;
  }
}

// Build a cleaner "city,state,US" style query: dedupe repeated comma tokens and
// drop a leading street line (a token that starts with a house number).
function cleanCityStateQuery(query: string): string {
  const tokens = query
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !/^\d+\s+\S/.test(token)); // drop "520 Cedar Crossings Dr"
  const unique = Array.from(new Set(tokens));
  const cleaned = unique.join(",");
  if (!cleaned) return "";
  return /(,\s*US|United States)$/i.test(cleaned) ? cleaned : cleaned + ",US";
}

export async function geocodeAddress(query: string): Promise<GeocodeResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter an address to look up." };
  }

  const apiKey = getOpenWeatherApiKey();
  if (!apiKey) {
    return { ok: false, error: "Geocoding needs OPENWEATHER_API_KEY set in Vercel." };
  }

  // Strategy 1: US ZIP code, if the address contains one. Most reliable.
  const zip = trimmed.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1];
  if (zip) {
    const zipUrl = new URL("https://api.openweathermap.org/geo/1.0/zip");
    zipUrl.searchParams.set("zip", zip + ",US");
    zipUrl.searchParams.set("appid", apiKey);
    const data = (await fetchJson(zipUrl)) as GeocodeEntry | null;
    if (data && isCoord(data.lat) && isCoord(data.lon)) {
      const label = [data.name, zip].filter(Boolean).join(", ");
      return { ok: true, latitude: data.lat, longitude: data.lon, label };
    }
  }

  // Strategy 2 & 3: direct geocoding on the raw query, then a cleaned
  // city/state query with the street line removed.
  const candidates = Array.from(new Set([trimmed, cleanCityStateQuery(trimmed)].filter(Boolean)));
  for (const candidate of candidates) {
    const directUrl = new URL("https://api.openweathermap.org/geo/1.0/direct");
    directUrl.searchParams.set("q", candidate);
    directUrl.searchParams.set("limit", "1");
    directUrl.searchParams.set("appid", apiKey);
    const results = (await fetchJson(directUrl)) as GeocodeEntry[] | null;
    const match = Array.isArray(results) ? results[0] : undefined;
    if (match && isCoord(match.lat) && isCoord(match.lon)) {
      const label = [match.name, match.state, match.country].filter(Boolean).join(", ");
      return { ok: true, latitude: match.lat, longitude: match.lon, label };
    }
  }

  return { ok: false, error: "No coordinates found for that address. Check the address or enter coordinates manually." };
}
