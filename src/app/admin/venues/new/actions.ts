"use server";

import { revalidatePath } from "next/cache";
import { createVenue } from "@/lib/services/venues";
import type { Venue } from "@/lib/types";

export type CreateVenueResult = {
  venue?: Venue;
  error?: string;
};

export async function createVenueAction(formData: FormData): Promise<CreateVenueResult> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();
  const bannerUrl = String(formData.get("banner_url") ?? "").trim();
  const mapImageUrl = String(formData.get("map_image_url") ?? "").trim();
  const mapNotes = String(formData.get("map_notes") ?? "").trim();
  const primaryColor = String(formData.get("primary_color") ?? "").trim();
  const secondaryColor = String(formData.get("secondary_color") ?? "").trim();

  if (!name || !description || !address) {
    return { error: "Name, description, and address are required." };
  }

  try {
    const venue = await createVenue({
      name,
      description,
      address,
      logo_url: logoUrl || null,
      banner_url: bannerUrl || null,
      map_image_url: mapImageUrl || null,
      map_notes: mapNotes || null,
      primary_color: primaryColor || null,
      secondary_color: secondaryColor || null,
    });
    revalidatePath("/admin/venues");
    return { venue };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create venue.",
    };
  }
}
