"use server";

import { revalidatePath } from "next/cache";
import { validateScheduleRows, type ScheduleCsvRow } from "@/lib/schedule-import";
import { getFields } from "@/lib/services/fields";
import { createSession } from "@/lib/services/sessions";
import { publicErrorMessage } from "@/lib/public-error";

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
    const rows = JSON.parse(rowsRaw) as ScheduleCsvRow[];
    if (!Array.isArray(rows) || !rows.length) return { error: "Nothing to import." };
    if (rows.length > 300) return { error: "Import at most 300 games at a time." };

    // Re-validate server side against real fields; never trust client mapping.
    const fields = await getFields();
    const validated = validateScheduleRows(rows, fields, { defaultDate, gameMinutes });
    const ready = validated.filter((row) => !row.errors.length);
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
