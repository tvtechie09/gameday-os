"use server";

import { revalidatePath } from "next/cache";
import { createTournament } from "@/lib/services/tournaments";
import type { Tournament } from "@/lib/types";

export type CreateTournamentResult = {
  tournament?: Tournament;
  error?: string;
};

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value : null;
}

export async function createTournamentAction(formData: FormData): Promise<CreateTournamentResult> {
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();

  if (!name || !startDate || !endDate) {
    return { error: "Tournament name, start date, and end date are required." };
  }

  try {
    const tournament = await createTournament(
      {
        name,
        description: readOptionalText(formData, "description"),
        start_date: startDate,
        end_date: endDate,
        logo_url: readOptionalText(formData, "logo_url"),
        website_url: readOptionalText(formData, "website_url"),
      },
    );
    revalidatePath("/admin/tournaments");
    revalidatePath("/admin/sessions/new");
    return { tournament };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create tournament." };
  }
}
