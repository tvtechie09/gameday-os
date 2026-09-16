"use server";

import { revalidatePath } from "next/cache";
import { validateScheduleRows, type ScheduleCsvRow } from "@/lib/schedule-import";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { createSession } from "@/lib/services/sessions";
import { publicErrorMessage } from "@/lib/public-error";
import { requireScheduleAccess } from "@/lib/access/schedule-authorization";

export type ImportResult = {
  created?: number;
  skipped?: number;
  errors?: string[];
  error?: string;
};

export async function importScheduleAction(formData: FormData): Promise<ImportResult> {
  try {
    const rowsRaw = String(formData.get("rows") ?? "[]");
    const defaultDate = String(formData.get("default_date") ?? "");
    const gameMinutes = Number(formData.get("game_minutes") ?? 90) || 90;
    const venueId = String(formData.get("venue_id") ?? "").trim();
    if (!venueId) return { error: "Pick the venue this schedule belongs to." };
    const rows = JSON.parse(rowsRaw) as ScheduleCsvRow[];
    if (!Array.isArray(rows) || !rows.length) return { error: "Nothing to import." };
    if (rows.length > 300) return { error: "Import at most 300 games at a time." };

    // Re-validate server side against real fields; never trust client mapping. Field
    // names repeat across venues, so scope the match to the chosen venue — otherwise a
    // schedule could silently land on another venue's identically-named field. The
    // venue itself must also be in the caller's scope (venue-scoped GMs can't import
    // into someone else's venue).
    const scoped = await getScopedVenuesAndFields();
    if (!scoped.venues.some((venue) => venue.id === venueId)) return { error: "That venue is not in your scope." };
    const fields = scoped.fields.map((field) => ({ id: field.id, name: field.name, venueId: field.venueId }));
    const validated = validateScheduleRows(rows, fields, { defaultDate, gameMinutes, venueId });
    const ready = validated.filter((row) => !row.errors.length);
    await requireScheduleAccess({ fieldIds: ready.map((row) => row.fieldId) });
    const failed = validated.filter((row) => row.errors.length);

    let created = 0;
    const errors: string[] = failed.slice(0, 10).map((row) => "Row " + row.rowNumber + ": " + row.errors.join("; "));
    for (const row of ready) {
      try {
        await createSession({
          field_id: row.fieldId,
          title: row.title || row.homeTeam + " vs " + row.awayTeam,
          sport_type: (row.sport || "") as never,
          home_team: row.homeTeam,
          away_team: row.awayTeam,
          start_time: row.startTime,
          end_time: row.endTime,
          status: "scheduled",
          external_source: "csv-import"
        });
        created += 1;
      } catch (error) {
        errors.push("Row " + row.rowNumber + ": " + publicErrorMessage(error, "Could not create this game."));
      }
    }
    revalidatePath("/admin/sessions");
    return { created, skipped: validated.length - created, errors: errors.slice(0, 15) };
  } catch (error) {
    return { error: publicErrorMessage(error, "Schedule import failed.") };
  }
}
