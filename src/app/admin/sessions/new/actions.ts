"use server";

import { revalidatePath } from "next/cache";
import { createSession } from "@/lib/services/sessions";
import type { Session } from "@/lib/types";

export type CreateSessionResult = {
  session?: Session;
  error?: string;
};

const validStatuses = ["scheduled", "active", "final"] as const;
const validLinkLabels = ["GameChanger", "SidelineHD", "YouTube", "SportsEngine", "TeamSnap", "Other"] as const;
const validSportTypes = ["baseball", "softball", "soccer", "football", "lacrosse", "basketball", "volleyball", "other"] as const;

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value : null;
}

function readLinkLabel(formData: FormData, key: string) {
  const value = readOptionalText(formData, key);
  return validLinkLabels.find((label) => label === value) ?? null;
}

export async function createSessionAction(formData: FormData): Promise<CreateSessionResult> {
  const fieldId = String(formData.get("field_id") ?? "").trim();
  const tournamentId = String(formData.get("tournament_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const homeTeam = String(formData.get("home_team") ?? "").trim();
  const awayTeam = String(formData.get("away_team") ?? "").trim();
  const sportType = String(formData.get("sport_type") ?? "baseball").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const status = String(formData.get("status") ?? "scheduled").trim();

  if (!fieldId || !title || !homeTeam || !awayTeam || !startTime) {
    return { error: "Venue, field, title, teams, and start date/time are required." };
  }

  if (!validStatuses.includes(status as Session["status"])) {
    return { error: "Choose a valid session status." };
  }

  if (!validSportTypes.includes(sportType as Session["sportType"])) {
    return { error: "Choose a valid sport type." };
  }

  try {
    const session = await createSession({
      field_id: fieldId,
      tournament_id: tournamentId || null,
      title,
      sport_type: sportType as Session["sportType"],
      home_team: homeTeam,
      away_team: awayTeam,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
      is_demo: formData.get("is_demo") === "on",
      status: status as Session["status"],
      primary_link_label: readLinkLabel(formData, "primary_link_label"),
      primary_link_url: readOptionalText(formData, "primary_link_url"),
      secondary_link_label: readLinkLabel(formData, "secondary_link_label"),
      secondary_link_url: readOptionalText(formData, "secondary_link_url"),
      notes: readOptionalText(formData, "notes"),
    });
    revalidatePath("/admin/sessions");
    return { session };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create session.",
    };
  }
}
