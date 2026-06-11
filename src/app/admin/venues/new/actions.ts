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

  if (!name || !description || !address) {
    return { error: "Name, description, and address are required." };
  }

  try {
    const venue = await createVenue({ name, description, address });
    revalidatePath("/admin/venues");
    return { venue };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create venue.",
    };
  }
}
