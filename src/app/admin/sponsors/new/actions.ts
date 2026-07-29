"use server";

import { revalidatePath } from "next/cache";
import { createSponsor } from "@/lib/services/sponsors";
import type { Sponsor } from "@/lib/types";

export type CreateSponsorResult = {
  sponsor?: Sponsor;
  error?: string;
};

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value : null;
}

export async function createSponsorAction(formData: FormData): Promise<CreateSponsorResult> {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "Sponsor name is required." };
  }

  try {
    const sponsor = await createSponsor({
      name,
      logo_url: readOptionalText(formData, "logo_url"),
      website_url: readOptionalText(formData, "website_url"),
      description: readOptionalText(formData, "description"),
      category: readOptionalText(formData, "category"),
    });

    revalidatePath("/admin/sponsors");
    return { sponsor };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create sponsor.",
    };
  }
}
