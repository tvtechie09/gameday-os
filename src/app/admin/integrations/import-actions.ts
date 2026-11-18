"use server";

import { revalidatePath } from "next/cache";
import { externalSourceImportScopeError } from "@/lib/services/external-source-scope";
import { getAuthorizedExternalSource, updateExternalSourceLastSync } from "@/lib/services/external-sources";
import { PermissionDeniedError } from "@/lib/services/identity";
import { fetchPublicFeed } from "@/lib/services/safe-feed-url";
import { getSessions } from "@/lib/services/sessions";
import { createSyncJobWithQueue, type CreateSyncQueueRecordInput } from "@/lib/services/sync-engine";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getVerifiedVenueActorId } from "@/lib/supabase/server-auth";
import type { Session, SessionSportType } from "@/lib/types";

export type CalendarImportEvent = {
  sourceId: string;
  title: string;
  startTime: string;
  endTime: string | null;
  location: string;
  description: string;
  notes: string | null;
  sourceUrl: string | null;
  homeTeam: string;
  awayTeam: string;
  rawData?: Record<string, unknown> | null;
};

export type CalendarImportRow = {
  externalSourceId: string;
  externalSourceUrl?: string | null;
  fieldId: string;
  fieldName?: string | null;
  title: string;
  startTime: string;
  endTime?: string | null;
  homeTeam: string;
  awayTeam: string;
  notes?: string | null;
  rawData?: Record<string, unknown> | null;
  sportType?: SessionSportType | "" | null;
  venueName?: string | null;
};

export type FetchCalendarResult = {
  events: CalendarImportEvent[];
  error?: string;
};

export type ImportCalendarResult = {
  created: number;
  jobId?: string;
  queued: number;
  skipped: number;
  errors: string[];
};

function unfoldIcalLines(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .reduce<string[]>((lines, line) => {
      if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
        lines[lines.length - 1] += line.slice(1);
      } else {
        lines.push(line);
      }
      return lines;
    }, []);
}

function parseIcalLine(line: string) {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex === -1) return null;

  const key = line.slice(0, separatorIndex).split(";")[0]?.toUpperCase();
  const value = line.slice(separatorIndex + 1);
  return key ? { key, value } : null;
}

function decodeIcalText(value: string) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseIcalDate(value: string) {
  const cleanValue = value.trim();
  const dateOnly = cleanValue.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    const date = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const dateTime = cleanValue.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!dateTime) return null;

  const [, year, month, day, hour, minute, second, zulu] = dateTime;
  const date = zulu === "Z"
    ? new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)))
    : new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function splitTeams(title: string) {
  const match = title.match(/^(.+?)\s+(?:vs\.?|v\.?|@)\s+(.+)$/i);
  return {
    awayTeam: match?.[2]?.trim() || "TBD",
    homeTeam: match?.[1]?.trim() || title,
  };
}

function parseIcalEvents(text: string): CalendarImportEvent[] {
  const lines = unfoldIcalLines(text);
  const events: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    const parsedLine = parseIcalLine(line);
    if (!parsedLine) continue;
    current[parsedLine.key] = decodeIcalText(parsedLine.value);
  }

  return events.flatMap((event) => {
    const title = event.SUMMARY || "Untitled event";
    const startTime = event.DTSTART ? parseIcalDate(event.DTSTART) : null;
    if (!startTime) return [];

    const teams = splitTeams(title);
    const sourceId = event.UID || `${startTime}|${title}|${event.LOCATION ?? ""}`;

    return [{
      awayTeam: teams.awayTeam,
      description: event.DESCRIPTION ?? "",
      endTime: event.DTEND ? parseIcalDate(event.DTEND) : null,
      homeTeam: teams.homeTeam,
      location: event.LOCATION ?? "",
      notes: event.DESCRIPTION || null,
      rawData: event,
      sourceId,
      sourceUrl: event.URL || null,
      startTime,
      title,
    }];
  });
}

function externalKey(session: Pick<Session, "externalSource" | "externalSourceId">) {
  return session.externalSource && session.externalSourceId ? `${session.externalSource}|${session.externalSourceId}` : null;
}

function externalUrlKey(session: Pick<Session, "externalSource" | "externalSourceUrl">) {
  return session.externalSource && session.externalSourceUrl ? `${session.externalSource}|url|${session.externalSourceUrl}` : null;
}

export async function fetchCalendarEventsAction(feedUrl: string, sourceId: string): Promise<FetchCalendarResult> {
  await getAuthorizedExternalSource(sourceId, await getVerifiedVenueActorId(), "integrations.view");
  try {
    const response = await fetchPublicFeed(feedUrl);

    if (!response.ok) {
      return { events: [], error: "This feed could not be imported. Try CSV import instead." };
    }

    const events = parseIcalEvents(await response.text());
    if (events.length === 0) {
      return { events: [], error: "This feed could not be imported. Try CSV import instead." };
    }

    return { events };
  } catch (error) {
    console.error("Failed to fetch calendar feed", error);
    return { events: [], error: "This feed could not be imported. Try CSV import instead." };
  }
}

export async function importCalendarSessionsAction({
  externalSourceName,
  externalSourceUrl,
  feedUrl,
  rows,
  sourceId,
}: {
  externalSourceName?: string;
  externalSourceUrl?: string | null;
  feedUrl: string;
  rows: CalendarImportRow[];
  sourceId: string;
}): Promise<ImportCalendarResult> {
  const actorUserId = await getVerifiedVenueActorId();
  const externalSource = await getAuthorizedExternalSource(sourceId, actorUserId, "integrations.sync");
  const fieldIds = [...new Set(rows.map((row) => row.fieldId))];
  const { data: fieldRows, error: fieldError } = fieldIds.length
    ? await getSupabaseAdminClient().from("fields").select("id,venue_id").in("id", fieldIds)
    : { data: [], error: null };
  if (fieldError) throw new Error(fieldError.message);
  const scopeError = externalSourceImportScopeError(externalSource.venueId, rows.map((row) => row.fieldId), (fieldRows ?? []).map((field) => ({ id: field.id, venueId: field.venue_id })));
  if (scopeError) throw new PermissionDeniedError(scopeError);

  const allowedFieldIds = new Set(fieldIds);
  const existingSessions = (await getSessions()).filter((session) => allowedFieldIds.has(session.fieldId));
  const existingExternalKeys = new Set(existingSessions.flatMap((session) => {
    const idKey = externalKey(session);
    const urlKey = externalUrlKey(session);
    return [idKey, urlKey].filter((key): key is string => Boolean(key));
  }));

  let skipped = 0;
  const storedExternalSourceName = externalSourceName?.trim() || externalSource.sourceName;
  const storedExternalSourceUrl = externalSourceUrl?.trim() || feedUrl || externalSource.sourceUrl;
  const syncRecords: CreateSyncQueueRecordInput[] = [];

  for (const row of rows) {
    const externalSourceId = row.externalSourceId;
    const idKey = `${storedExternalSourceName}|${externalSourceId}`;
    const rowExternalSourceUrl = row.externalSourceUrl?.trim()
      || (storedExternalSourceUrl ? `${storedExternalSourceUrl}#${encodeURIComponent(externalSourceId)}` : null);
    const urlKey = rowExternalSourceUrl ? `${storedExternalSourceName}|url|${rowExternalSourceUrl}` : null;

    if (existingExternalKeys.has(idKey) || Boolean(urlKey && existingExternalKeys.has(urlKey))) {
      skipped += 1;
      continue;
    }

    syncRecords.push({
      sourceData: {
        kind: "session" as const,
        session: {
          away_team: row.awayTeam || "TBD",
          end_time: row.endTime,
          external_source: storedExternalSourceName,
          external_source_id: externalSourceId,
          external_source_url: rowExternalSourceUrl,
          field_id: row.fieldId,
          home_team: row.homeTeam || row.title,
          notes: row.notes,
          sport_type: row.sportType || "baseball",
          start_time: row.startTime,
          status: "scheduled",
          title: row.title,
        },
        source: {
          field_name: row.fieldName ?? null,
          provider: storedExternalSourceName,
          raw: row.rawData ?? null,
          source_url: rowExternalSourceUrl,
          venue_name: row.venueName ?? null,
        },
      },
      sourceRecordId: externalSourceId,
    });
    existingExternalKeys.add(idKey);
    if (urlKey) {
      existingExternalKeys.add(urlKey);
    }
  }

  const job = await createSyncJobWithQueue({
    records: syncRecords,
    recordsFound: rows.length,
    recordsSkipped: skipped,
    sourceId,
    sourceType: storedExternalSourceName,
  }, actorUserId);

  await updateExternalSourceLastSync(sourceId, actorUserId);

  revalidatePath("/admin/integrations");
  revalidatePath("/admin/sessions");
  revalidatePath("/admin/sync");
  revalidatePath("/admin/sync/review");

  return { created: 0, errors: [], jobId: job.id, queued: syncRecords.length, skipped };
}
