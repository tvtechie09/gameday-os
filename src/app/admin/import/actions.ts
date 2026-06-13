"use server";

import { revalidatePath } from "next/cache";
import { createSyncJobWithQueue } from "@/lib/services/sync-engine";
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
  jobId?: string;
  queued: number;
  skipped: number;
  errors: string[];
};

export async function importSessionsAction(rows: ImportSessionRow[]): Promise<ImportSessionsResult> {
  const job = await createSyncJobWithQueue({
    records: rows.map((row, index) => ({
      sourceData: {
        kind: "session",
        session: {
          away_team: row.awayTeam,
          field_id: row.fieldId,
          home_team: row.homeTeam,
          notes: row.notes,
          primary_link_label: row.primaryLinkLabel,
          primary_link_url: row.primaryLinkUrl,
          secondary_link_label: row.secondaryLinkLabel,
          secondary_link_url: row.secondaryLinkUrl,
          sport_type: row.sportType,
          start_time: row.startTime,
          status: row.status,
          title: row.title,
        },
      },
      sourceRecordId: `csv:${row.fieldId}:${row.title}:${row.startTime}:${index + 1}`,
    })),
    recordsFound: rows.length,
    sourceType: "csv",
  });

  revalidatePath("/admin/sessions");
  revalidatePath("/admin/import");
  revalidatePath("/admin/sync");
  revalidatePath("/admin/sync/review");

  return { created: 0, errors: [], jobId: job.id, queued: rows.length, skipped: 0 };
}
