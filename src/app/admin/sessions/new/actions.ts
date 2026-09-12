"use server";

import { revalidatePath } from "next/cache";
import { createSession } from "@/lib/services/sessions";
import type { Session } from "@/lib/types";
import { requireScheduleAccess } from "@/lib/access/schedule-authorization";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { venueLocalDateTimeToIso } from "@/lib/venue-timezone";
import { safelyLogAudit } from "@/lib/services/identity";

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
    const ctx = await requireScheduleAccess({ fieldIds: [fieldId] });
    const scoped = await getScopedVenuesAndFields();
    const field = scoped.fields.find((candidate) => candidate.id === fieldId);
    const venue = field ? scoped.venues.find((candidate) => candidate.id === field.venueId) : null;
    if (!field || !venue) return { error: "Choose a field in your venue." };
    const normalizedStartTime = venueLocalDateTimeToIso(startTime, venue.timezone);
    const normalizedEndTime = endTime ? venueLocalDateTimeToIso(endTime, venue.timezone) : null;
    const session = await createSession({
      field_id: fieldId,
      tournament_id: tournamentId || null,
      title,
      sport_type: sportType as Session["sportType"],
      home_team: homeTeam,
      away_team: awayTeam,
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
      is_demo: formData.get("is_demo") === "on",
      status: status as Session["status"],
      primary_link_label: readLinkLabel(formData, "primary_link_label"),
      primary_link_url: readOptionalText(formData, "primary_link_url"),
      secondary_link_label: readLinkLabel(formData, "secondary_link_label"),
      secondary_link_url: readOptionalText(formData, "secondary_link_url"),
      notes: readOptionalText(formData, "notes"),
    });
    await safelyLogAudit({
      actorUserId: ctx.userId,
      action: "session.schedule.created",
      resourceType: "session",
      resourceId: session.id,
      scopeType: "venue",
      scopeId: venue.id,
      metadata: {
        field_id: field.id,
        start_time: normalizedStartTime,
        end_time: normalizedEndTime,
        status: session.status,
        lifecycle_status: session.lifecycleStatus,
      },
    });
    revalidatePath("/admin/sessions");
    return { session };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create session.",
    };
  }
}
