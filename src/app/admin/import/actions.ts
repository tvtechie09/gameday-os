"use server";

import { revalidatePath } from "next/cache";
import { createSession, getSessions } from "@/lib/services/sessions";
import type { Session, SessionLinkLabel, SessionSportType } from "@/lib/types";

export type ImportSessionRow = {
  fieldId: string;
  title: string;
  startTime: string;
  homeTeam: string;
  awayTeam: string;
  sportType?: SessionSportType | "" | null;
  status: Session["status"];
  primaryLinkLabel?: SessionLinkLabel | "" | null;
  primaryLinkUrl?: string | null;
  secondaryLinkLabel?: SessionLinkLabel | "" | null;
  secondaryLinkUrl?: string | null;
  notes?: string | null;
};

export type ImportSessionsResult = {
  created: number;
  skipped: number;
  errors: string[];
};

function duplicateKey(row: Pick<ImportSessionRow, "awayTeam" | "fieldId" | "homeTeam" | "startTime" | "title">) {
  return [
    row.fieldId,
    row.title.trim().toLowerCase(),
    row.homeTeam.trim().toLowerCase(),
    row.awayTeam.trim().toLowerCase(),
    new Date(row.startTime).toISOString(),
  ].join("|");
}

export async function importSessionsAction(rows: ImportSessionRow[]): Promise<ImportSessionsResult> {
  const existingSessions = await getSessions();
  const existingKeys = new Set(
    existingSessions.map((session) =>
      duplicateKey({
        fieldId: session.fieldId,
        title: session.title,
        homeTeam: session.homeTeam,
        awayTeam: session.awayTeam,
        startTime: session.startTime,
      }),
    ),
  );

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const key = duplicateKey(row);

    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }

    try {
      await createSession({
        field_id: row.fieldId,
        title: row.title,
        home_team: row.homeTeam,
        away_team: row.awayTeam,
        sport_type: row.sportType,
        start_time: row.startTime,
        status: row.status,
        primary_link_label: row.primaryLinkLabel,
        primary_link_url: row.primaryLinkUrl,
        secondary_link_label: row.secondaryLinkLabel,
        secondary_link_url: row.secondaryLinkUrl,
        notes: row.notes,
      });
      existingKeys.add(key);
      created += 1;
    } catch (error) {
      errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : "Unable to create session."}`);
    }
  }

  revalidatePath("/admin/sessions");
  revalidatePath("/admin/import");

  return { created, skipped, errors };
}
