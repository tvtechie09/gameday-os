"use server";

import { revalidatePath } from "next/cache";
import { geocodeAddress, type GeocodeResult } from "@/lib/services/geocode";
import { createWeatherProfile, updateWeatherProfile } from "@/lib/services/weather-profiles";
import type { WeatherProfile } from "@/lib/types";
import { readWeatherProfileFormData } from "./form-utils";

export type WeatherProfileResult = {
  error?: string;
  profile?: WeatherProfile;
};

function revalidateWeatherSurfaces() {
  revalidatePath("/admin/weather");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/game-day");
  revalidatePath("/venues/[venueId]", "page");
  revalidatePath("/fields/[fieldId]", "page");
}

// Fill latitude/longitude from a venue's address using OpenWeather geocoding,
// so admins don't have to look up coordinates by hand.
export async function geocodeAddressAction(address: string): Promise<GeocodeResult> {
  return geocodeAddress(address);
}

export async function createWeatherProfileAction(formData: FormData): Promise<WeatherProfileResult> {
  const parsed = readWeatherProfileFormData(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    const profile = await createWeatherProfile(parsed.data);
    revalidateWeatherSurfaces();
    return { profile };
  } catch (error) {
    console.error("Failed to create weather profile", error);
    return { error: error instanceof Error ? error.message : "Unable to create weather profile." };
  }
}

export async function updateWeatherProfileAction(id: string, formData: FormData): Promise<WeatherProfileResult> {
  const parsed = readWeatherProfileFormData(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    const profile = await updateWeatherProfile(id, parsed.data);
    revalidateWeatherSurfaces();
    return { profile };
  } catch (error) {
    console.error("Failed to update weather profile", error);
    return { error: error instanceof Error ? error.message : "Unable to update weather profile." };
  }
}
