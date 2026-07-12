import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { WeatherProfile, WeatherProfileStatus, WeatherSource } from "@/lib/types";
import { getOrganizationDataScope } from "./organization-data-scope";

type WeatherProfileRow = Database["public"]["Tables"]["weather_profiles"]["Row"];

export type CreateWeatherProfileInput = {
  venue_id: string;
  location_name: string;
  latitude?: number | null;
  longitude?: number | null;
  weather_source: WeatherSource;
  status: WeatherProfileStatus;
  notes?: string | null;
};

export type UpdateWeatherProfileInput = CreateWeatherProfileInput;

export const weatherSources: WeatherSource[] = ["manual", "national_weather_service", "weatherkit", "other"];
export const weatherProfileStatuses: WeatherProfileStatus[] = ["not_configured", "configured", "monitoring", "paused", "offline"];

const weatherProfileSelect = "id,venue_id,location_name,latitude,longitude,weather_source,status,notes,created_at,updated_at";

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readWeatherSource(value: string | null | undefined): WeatherSource {
  return weatherSources.find((source) => source === value) ?? "manual";
}

function readWeatherStatus(value: string | null | undefined): WeatherProfileStatus {
  return weatherProfileStatuses.find((status) => status === value) ?? "not_configured";
}

function readOptionalNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isMissingWeatherProfilesTableError(error: { code?: string; message?: string }) {
  return error.code === "PGRST205"
    || error.message?.includes("weather_profiles") === true
    || error.message?.includes("schema cache") === true;
}

function mapWeatherProfile(row: WeatherProfileRow): WeatherProfile {
  return {
    createdAt: row.created_at,
    id: row.id,
    latitude: readOptionalNumber(row.latitude),
    locationName: row.location_name,
    longitude: readOptionalNumber(row.longitude),
    notes: readOptionalText(row.notes),
    status: readWeatherStatus(row.status),
    updatedAt: row.updated_at,
    venueId: row.venue_id,
    weatherSource: readWeatherSource(row.weather_source),
  };
}

export function getWeatherSourceLabel(source: WeatherSource) {
  const labels: Record<WeatherSource, string> = {
    manual: "Manual",
    national_weather_service: "National Weather Service",
    other: "Other",
    weatherkit: "WeatherKit",
  };

  return labels[source];
}

export function getWeatherStatusLabel(status: WeatherProfileStatus) {
  const labels: Record<WeatherProfileStatus, string> = {
    configured: "Configured",
    monitoring: "Monitoring",
    not_configured: "Not Configured",
    offline: "Offline",
    paused: "Paused",
  };

  return labels[status];
}

export function getWeatherStatusClass(status: WeatherProfileStatus) {
  if (status === "monitoring") {
    return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  }

  if (status === "configured") {
    return "bg-blue-50 text-blue-800";
  }

  if (status === "offline") {
    return "bg-red-100 text-red-900";
  }

  if (status === "paused") {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-slate-100 text-slate-700";
}

export async function getWeatherProfiles(): Promise<WeatherProfile[]> {
  const supabase = getSupabaseAdminClient();
  const scope = await getOrganizationDataScope();
  const { data, error } = await supabase
    .from("weather_profiles")
    .select(weatherProfileSelect)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingWeatherProfilesTableError(error)) {
      console.error("weather_profiles table is unavailable; returning no weather profiles.", error);
      return [];
    }

    throw new Error(error.message);
  }

  const profiles = (data ?? []).map(mapWeatherProfile);
  return scope ? profiles.filter((profile) => scope.venueIds.has(profile.venueId)) : profiles;
}

export async function getWeatherProfile(id: string): Promise<WeatherProfile | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("weather_profiles")
    .select(weatherProfileSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingWeatherProfilesTableError(error)) {
      console.error("weather_profiles table is unavailable; returning no weather profile.", error);
      return null;
    }

    throw new Error(error.message);
  }

  return data ? mapWeatherProfile(data) : null;
}

export async function getWeatherProfilesByVenueId(venueId: string): Promise<WeatherProfile[]> {
  const profiles = await getWeatherProfiles();
  return profiles.filter((profile) => profile.venueId === venueId);
}

export async function createWeatherProfile(data: CreateWeatherProfileInput): Promise<WeatherProfile> {
  const supabase = getSupabaseAdminClient();
  const { data: profile, error } = await supabase
    .from("weather_profiles")
    .insert({
      latitude: data.latitude ?? null,
      location_name: data.location_name,
      longitude: data.longitude ?? null,
      notes: readOptionalText(data.notes),
      status: readWeatherStatus(data.status),
      venue_id: data.venue_id,
      weather_source: readWeatherSource(data.weather_source),
    })
    .select(weatherProfileSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapWeatherProfile(profile);
}

export async function updateWeatherProfile(id: string, data: UpdateWeatherProfileInput): Promise<WeatherProfile> {
  const supabase = getSupabaseAdminClient();
  const { data: profile, error } = await supabase
    .from("weather_profiles")
    .update({
      latitude: data.latitude ?? null,
      location_name: data.location_name,
      longitude: data.longitude ?? null,
      notes: readOptionalText(data.notes),
      status: readWeatherStatus(data.status),
      updated_at: new Date().toISOString(),
      venue_id: data.venue_id,
      weather_source: readWeatherSource(data.weather_source),
    })
    .eq("id", id)
    .select(weatherProfileSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapWeatherProfile(profile);
}
