"use server";

import { revalidatePath } from "next/cache";
import { createField } from "@/lib/services/fields";
import type { Field } from "@/lib/types";

export type CreateFieldResult = {
  field?: Field;
  error?: string;
};

function readOptionalCoordinate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createFieldAction(formData: FormData): Promise<CreateFieldResult> {
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const sportType = String(formData.get("sport_type") ?? "").trim();
  const mapLabel = String(formData.get("map_label") ?? "").trim();

  if (!venueId || !name || !sportType) {
    return { error: "Venue, field name, and sport type are required." };
  }

  try {
    const field = await createField({
      venue_id: venueId,
      name,
      sport_type: sportType,
      map_label: mapLabel || null,
      map_x: readOptionalCoordinate(formData, "map_x"),
      map_y: readOptionalCoordinate(formData, "map_y"),
    });
    revalidatePath("/admin/fields");
    return { field };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create field.",
    };
  }
}
