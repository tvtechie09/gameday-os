"use server";

import { revalidatePath } from "next/cache";
import { createSession, getSessions } from "@/lib/services/sessions";
import type { Session } from "@/lib/types";

export type CalendarEventPreview = {
  sourceId: string;
  title: string;
  startTime: string;
  endTime: string | null;
  location: string;
  description: string;
  url: string | null;
  homeTeam: string;
  awayTeam: string;
  notes: string | null;
};

export type ExternalImportRow = {
  fieldId: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  homeTeam: string;
  awayTeam: string;
  notes?: string | null;
  externalSource: string;
  externalSourceId: string;
  externalSourceUrl?: string | null;
};

export type CalendarFetchResult = {
  events: CalendarEventPreview[];
  error?: string;
};

export type ExternalImportResult = {
  created: number;
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

function getIcalKey(line: string) {
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
  const clean = value.trim();
  const dateOnly = clean.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])).toISOString();
  }

  const dateTime = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
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
    homeTeam: match?.[1]?.trim() ?? "",
    awayTeam: match?.[2]?.trim() ?? "",
  };
}

function parseCalendarEvents(text: string): CalendarEventPreview[] {
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

    const entry = getIcalKey(line);
    if (!entry) continue;
    current[entry.key] = decodeIcalText(entry.value);
  }

  return events.flatMap((event) => {
    const title = event.SUMMARY || "Untitled event";
    const startTime = event.DTSTART ? parseIcalDate(event.DTSTART) : null;
    if (!startTime) return [];

    const teams = splitTeams(title);
    const fallbackId = `${startTime}|${title}`;

    return [{
      awayTeam: teams.awayTeam,
      description: event.DESCRIPTION ?? "",
      endTime: event.DTEND ? parseIcalDate(event.DTEND) : null,
      homeTeam: teams.homeTeam,
      location: event.LOCATION ?? "",
      notes: event.DESCRIPTION || null,
      sourceId: event.UID || fallbackId,
      startTime,
      title,
      url: event.URL || null,
    }];
  });
}

function externalKey(session: Pick<Session, "externalSource" | "externalSourceId">) {
  return session.externalSource && session.externalSourceId ? `${session.externalSource}|${session.externalSourceId}` : null;
}

function duplicateKey(row: Pick<ExternalImportRow, "awayTeam" | "fieldId" | "homeTeam" | "startTime" | "title">) {
  return [
    row.fieldId,
    row.title.trim().toLowerCase(),
    row.homeTeam.trim().toLowerCase(),
    row.awayTeam.trim().toLowerCase(),
    new Date(row.startTime).toISOString(),
  ].join("|");
}

export async function fetchCalendarEventsAction(sourceUrl: string): Promise<CalendarFetchResult> {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return { events: [], error: "Enter a valid public calendar URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { events: [], error: "Calendar URL must start with http:// or https://." };
  }

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: { Accept: "text/calendar,text/plain,*/*" },
    });

    if (!response.ok) {
      return { events: [], error: `Calendar feed returned ${response.status}.` };
    }

    const text = await response.text();
    const events = parseCalendarEvents(text);
    if (events.length === 0) {
      return { events: [], error: "No calendar events could be parsed from this feed." };
    }

    return { events };
  } catch (error) {
    console.error("Failed to fetch calendar feed", error);
    return { events: [], error: "Unable to fetch this calendar feed. Confirm it is public and reachable." };
  }
}

export async function importExternalSessionsAction(rows: ExternalImportRow[]): Promise<ExternalImportResult> {
  const existingSessions = await getSessions();
  const existingExternalKeys = new Set(existingSessions.flatMap((session) => {
    const key = externalKey(session);
    return key ? [key] : [];
  }));
  const existingSessionKeys = new Set(existingSessions.map((session) => duplicateKey({
    awayTeam: session.awayTeam,
    fieldId: session.fieldId,
    homeTeam: session.homeTeam,
    startTime: session.startTime,
    title: session.title,
  })));

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const sourceKey = `${row.externalSource}|${row.externalSourceId}`;
    const sessionKey = duplicateKey(row);

    if (existingExternalKeys.has(sourceKey) || existingSessionKeys.has(sessionKey)) {
      skipped += 1;
      continue;
    }

    try {
      await createSession({
        away_team: row.awayTeam,
        end_time: row.endTime,
        external_source: row.externalSource,
        external_source_id: row.externalSourceId,
        external_source_url: row.externalSourceUrl,
        field_id: row.fieldId,
        home_team: row.homeTeam,
        notes: row.notes,
        start_time: row.startTime,
        status: "scheduled",
        title: row.title,
      });
      existingExternalKeys.add(sourceKey);
      existingSessionKeys.add(sessionKey);
      created += 1;
    } catch (error) {
      errors.push(`Event ${index + 1}: ${error instanceof Error ? error.message : "Unable to create session."}`);
    }
  }

  revalidatePath("/admin/integrations");
  revalidatePath("/admin/sessions");
  revalidatePath("/admin/dashboard");

  return { created, skipped, errors };
}
