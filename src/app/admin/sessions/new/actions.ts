"use server";

import { revalidatePath } from "next/cache";
import { createSession } from "@/lib/services/sessions";
import type { Session } from "@/lib/types";

export type CreateSessionResult = {
  session?: Session;
  error?: string;
};

const validStatuses = ["scheduled", "active", "final"] as const;

export async function createSessionAction(formData: FormData): Promise<CreateSessionResult> {
  const fieldId = String(formData.get("field_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const homeTeam = String(formData.get("home_team") ?? "").trim();
  const awayTeam = String(formData.get("away_team") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const status = String(formData.get("status") ?? "scheduled").trim();

  if (!fieldId || !title || !homeTeam || !awayTeam || !startTime) {
    return { error: "Venue, field, title, teams, and start date/time are required." };
  }

  if (!validStatuses.includes(status as Session["status"])) {
    return { error: "Choose a valid session status." };
  }

  try {
    const session = await createSession({
      field_id: fieldId,
      title,
      home_team: homeTeam,
      away_team: awayTeam,
      start_time: new Date(startTime).toISOString(),
      status: status as Session["status"],
    });
    revalidatePath("/admin/sessions");
    return { session };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create session.",
    };
  }
}
