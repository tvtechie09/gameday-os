"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import { getExternalSourceTypeLabel } from "@/lib/services/external-sources";
import type { ExternalSource, Field, Session, SessionSportType, Venue } from "@/lib/types";
import { fetchCalendarEventsAction, importCalendarSessionsAction, type CalendarImportEvent, type CalendarImportRow, type ImportCalendarResult } from "./import-actions";

type EditableCalendarRow = CalendarImportEvent & {
  fieldId: string;
  venueId: string;
  sportType: SessionSportType;
};

type CsvRow = Record<string, string>;
type ImportMode = "csv" | "calendar" | "manual";

type CalendarImportAdapterProps = {
  fields: Field[];
  sessions: Session[];
  sources: ExternalSource[];
  venues: Venue[];
};

const sportTypes: SessionSportType[] = ["baseball", "softball", "soccer", "football", "lacrosse", "basketball", "volleyball", "other"];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date/time";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function findExactFieldByName(fieldName: string, fields: Field[], venueId?: string | null) {
  const normalizedFieldName = normalize(fieldName);
  if (!normalizedFieldName) return null;

  return fields.find((field) => {
    const venueMatches = venueId ? field.venueId === venueId : true;
    return venueMatches && normalize(field.name) === normalizedFieldName;
  }) ?? null;
}

function findExactField(event: CalendarImportEvent, fields: Field[], venueId?: string | null) {
  const location = normalize(event.location);
  if (!location) return null;
  return findExactFieldByName(event.location, fields, venueId);
}

function buildRows(events: CalendarImportEvent[], fields: Field[], venueId?: string | null) {
  return events.map((event) => {
    const field = findExactField(event, fields, venueId);
    return {
      ...event,
      fieldId: field?.id ?? "",
      sportType: "baseball" as SessionSportType,
      venueId: field?.venueId ?? "",
    };
  });
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCsv(text: string) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0 && !line.trim().startsWith("#"));

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });

  return { headers, rows };
}

function readCsvCell(row: CsvRow, candidates: string[]) {
  const entries = Object.entries(row);
  const normalizedCandidates = candidates.map(normalize);
  return entries.find(([header]) => normalizedCandidates.includes(normalize(header)))?.[1]?.trim() ?? "";
}

function parseCsvDateTime(dateValue: string, timeValue: string) {
  const combinedValue = dateValue && timeValue ? `${dateValue} ${timeValue}` : dateValue || timeValue;
  const parsed = new Date(combinedValue);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function getStoredExternalSourceName(source: ExternalSource | null) {
  if (!source) return "";
  if (source.sourceType === "sportsengine") return "sportsengine";
  if (source.sourceType === "hometeamsonline") return "hometeamsonline";
  return source.sourceName;
}

function getAdapterName(source: ExternalSource | null) {
  if (source?.sourceType === "hometeamsonline") return "HomeTeamsOnline";
  if (source?.sourceType === "sportsengine") return "SportsEngine";
  return "External schedule";
}

function getCsvSourcePrefix(source: ExternalSource | null) {
  const storedSourceName = getStoredExternalSourceName(source);
  return storedSourceName || "external";
}

function buildProviderCsvRows(csvRows: CsvRow[], fields: Field[], venues: Venue[], source: ExternalSource | null) {
  const venuesByName = new Map(venues.map((venue) => [normalize(venue.name), venue]));
  const sourcePrefix = getCsvSourcePrefix(source);

  return csvRows.map<EditableCalendarRow>((row, index) => {
    const venueName = readCsvCell(row, ["Venue", "Venue Name", "Facility"]);
    const fieldName = readCsvCell(row, ["Field", "Field Name", "Location", "Location Name"]);
    const title = readCsvCell(row, ["Session Title", "Title", "Event", "Game"]);
    const date = readCsvCell(row, ["Date", "Game Date", "Start Date"]);
    const time = readCsvCell(row, ["Time", "Start Time"]);
    const startTime = parseCsvDateTime(date, time || readCsvCell(row, ["Start"]));
    const endTimeValue = readCsvCell(row, ["End Time"]);
    const endTime = endTimeValue ? parseCsvDateTime(readCsvCell(row, ["End Date"]) || date, endTimeValue) || null : null;
    const venue = venuesByName.get(normalize(venueName));
    const field = venue ? findExactFieldByName(fieldName, fields, venue.id) : null;
    const homeTeam = readCsvCell(row, ["Home Team", "Home", "HomeTeam"]) || title || "TBD";
    const awayTeam = readCsvCell(row, ["Away Team", "Away", "AwayTeam"]) || "TBD";
    const sourceId = readCsvCell(row, ["External Source ID", "UID", "Event ID", "Game ID", "ID"]) || `${sourcePrefix}:${venueName}:${fieldName}:${title}:${startTime || index + 2}`;

    return {
      awayTeam,
      description: readCsvCell(row, ["Description", "Notes"]),
      endTime,
      fieldId: field?.id ?? "",
      homeTeam,
      location: fieldName,
      notes: readCsvCell(row, ["Notes", "Description"]) || null,
      sourceId,
      sourceUrl: readCsvCell(row, ["URL", "Source URL", "Link"]) || null,
      sportType: "baseball",
      startTime,
      title: title || `${homeTeam} vs ${awayTeam}`,
      venueId: venue?.id ?? "",
    };
  });
}

function getRowErrors(row: EditableCalendarRow) {
  const errors: string[] = [];

  if (!row.venueId) errors.push("Missing venue. Match an existing venue name exactly.");
  if (!row.fieldId) errors.push(`Missing field${row.location ? `: ${row.location}` : ""}. Match an existing field name exactly.`);
  if (!row.title.trim()) errors.push("Missing title");
  if (Number.isNaN(new Date(row.startTime).getTime())) errors.push("Invalid start time");

  return errors;
}

function buildImportRow(row: EditableCalendarRow): CalendarImportRow | null {
  const errors = getRowErrors(row);
  if (errors.length > 0) return null;

  return {
    awayTeam: row.awayTeam || "TBD",
    endTime: row.endTime,
    externalSourceId: row.sourceId,
    fieldId: row.fieldId,
    homeTeam: row.homeTeam || row.title,
    notes: row.notes,
    sportType: row.sportType,
    startTime: row.startTime,
    title: row.title,
  };
}

export function CalendarImportAdapter({ fields, sessions, sources, venues }: CalendarImportAdapterProps) {
  const importableSources = sources.filter((source) => source.sourceType === "sportsengine" || source.sourceType === "ical" || source.sourceType === "hometeamsonline" || source.sourceType === "other");
  const defaultSourceId = importableSources[0]?.id ?? "";
  const [importMode, setImportMode] = useState<ImportMode>("csv");
  const [sourceId, setSourceId] = useState(defaultSourceId);
  const selectedSource = sources.find((source) => source.id === sourceId) ?? null;
  const [feedUrl, setFeedUrl] = useState(selectedSource?.sourceUrl ?? "");
  const [csvFileName, setCsvFileName] = useState("");
  const [rows, setRows] = useState<EditableCalendarRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<ImportCalendarResult | null>(null);

  const venuesById = useMemo(() => new Map(venues.map((venue) => [venue.id, venue])), [venues]);
  const fieldsByVenueId = useMemo(() => new Map(venues.map((venue) => [venue.id, fields.filter((field) => field.venueId === venue.id)])), [fields, venues]);
  const externalKeys = useMemo(() => new Set(sessions.flatMap((session) => {
    if (!session.externalSource || !session.externalSourceId) return [];
    return [`${session.externalSource}|${session.externalSourceId}`];
  })), [sessions]);

  const validatedRows = useMemo(() => rows.map((row) => {
    const errors = getRowErrors(row);
    const externalSourceName = getStoredExternalSourceName(selectedSource);
    const duplicate = Boolean(externalSourceName && externalKeys.has(`${externalSourceName}|${row.sourceId}`));
    return {
      duplicate,
      errors: duplicate ? [...errors, "Duplicate external event"] : errors,
      importRow: duplicate ? null : buildImportRow(row),
      row,
    };
  }), [externalKeys, rows, selectedSource]);

  const validRows = validatedRows.filter((row) => row.importRow);
  const duplicateRows = validatedRows.filter((row) => row.duplicate);
  const invalidRows = validatedRows.filter((row) => row.errors.length > 0 && !row.duplicate);
  const adapterName = getAdapterName(selectedSource);
  const setupHelp = selectedSource?.sourceType === "hometeamsonline"
    ? "Export your schedule from HomeTeamsOnline or paste a public calendar feed URL if available."
    : selectedSource?.sourceType === "sportsengine"
      ? "Export your schedule from SportsEngine or paste a public calendar feed URL."
      : "Upload a CSV export or paste a public calendar feed URL if available.";

  function handleSourceChange(nextSourceId: string) {
    const nextSource = sources.find((source) => source.id === nextSourceId) ?? null;
    setSourceId(nextSourceId);
    setFeedUrl(nextSource?.sourceUrl ?? "");
    setRows([]);
    setSummary(null);
    setErrorMessage(null);
  }

  async function handleCsvFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSummary(null);
    setCsvFileName(file.name);

    const parsed = parseCsv(await file.text());
    if (parsed.rows.length === 0) {
      setRows([]);
      setErrorMessage("No schedule rows were found in this CSV export.");
      return;
    }

    setRows(buildProviderCsvRows(parsed.rows, fields, venues, selectedSource));
  }

  async function fetchEvents() {
    if (!feedUrl.trim() || isFetching) return;
    setIsFetching(true);
    setErrorMessage(null);
    setSummary(null);
    const result = await fetchCalendarEventsAction(feedUrl);
    setIsFetching(false);

    if (result.error) {
      setRows([]);
      setErrorMessage(result.error);
      return;
    }

    setRows(buildRows(result.events, fields, selectedSource?.venueId));
  }

  async function importRows() {
    if (!selectedSource || validRows.length === 0 || isImporting) return;
    setIsImporting(true);
    setSummary(await importCalendarSessionsAction({
      feedUrl,
      externalSourceName: getStoredExternalSourceName(selectedSource),
      externalSourceUrl: feedUrl || selectedSource.sourceUrl,
      rows: validRows.flatMap((row) => (row.importRow ? [row.importRow] : [])),
      sourceId: selectedSource.id,
    }));
    setIsImporting(false);
  }

  function updateRow(index: number, updates: Partial<EditableCalendarRow>) {
    setRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next = { ...row, ...updates };
      if (updates.fieldId) {
        const field = fields.find((item) => item.id === updates.fieldId);
        next.venueId = field?.venueId ?? "";
      }
      if (updates.venueId) {
        const venueFields = fieldsByVenueId.get(updates.venueId) ?? [];
        next.fieldId = venueFields.some((field) => field.id === next.fieldId) ? next.fieldId : "";
      }
      return next;
    }));
  }

  return (
    <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Import adapter</p>
          <h2 className="mt-2 text-xl font-black">SportsEngine / HomeTeamsOnline schedule import</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            {setupHelp} Preview every row, match existing venue and field names, and import scheduled sessions without API credentials.
          </p>
        </div>
        <Link href="/admin/import" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
          CSV import
        </Link>
      </div>

      {importableSources.length === 0 ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-950">Create a SportsEngine, iCal, HomeTeamsOnline, or Other integration source before importing a schedule.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { key: "csv" as const, label: "CSV export" },
              { key: "calendar" as const, label: "iCal/calendar URL" },
              { key: "manual" as const, label: "Manual public schedule URL" },
            ].map((mode) => (
              <button
                className={`min-h-11 rounded-lg border px-4 text-sm font-black ${importMode === mode.key ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--foreground)]"}`}
                key={mode.key}
                onClick={() => {
                  setImportMode(mode.key);
                  setRows([]);
                  setSummary(null);
                  setErrorMessage(null);
                }}
                type="button"
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_2fr] lg:items-end">
            <label className="grid gap-2">
              <span className="text-sm font-bold">Integration source</span>
              <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => handleSourceChange(event.target.value)} value={sourceId}>
                {importableSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.sourceName} · {getExternalSourceTypeLabel(source.sourceType)}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-lg bg-[var(--background)] p-4">
              <p className="text-sm font-bold">Import rules</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Venue and field names must already exist in GameDay OS. Missing names are flagged for review and will not be created automatically.</p>
            </div>
          </div>

          {importMode === "csv" ? (
            <div className="grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
              <label className="grid gap-2">
                <span className="text-sm font-bold">{adapterName} CSV export</span>
                <input accept=".csv,text/csv" className="min-h-11 rounded-lg border border-[var(--line)] bg-white p-3 text-sm font-semibold" onChange={handleCsvFileChange} type="file" />
              </label>
              {csvFileName ? <p className="text-sm font-semibold text-[var(--muted)]">Loaded {csvFileName}</p> : null}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[2fr_auto] lg:items-end">
              <label className="grid gap-2">
                <span className="text-sm font-bold">{importMode === "manual" ? "Public schedule URL" : "Calendar/feed URL"}</span>
                <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => setFeedUrl(event.target.value)} placeholder="https://example.com/schedule.ics" value={feedUrl} />
              </label>
              <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={!feedUrl.trim() || isFetching} onClick={fetchEvents} type="button">
                {isFetching ? "Fetching..." : "Fetch events"}
              </button>
            </div>
          )}

          {errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-900">{errorMessage}</p>
            </div>
          ) : null}
        </div>
      )}

      {rows.length > 0 ? (
        <div className="mt-6 grid gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-black">Preview events</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Exact field-name matches are marked valid. Invalid rows can be mapped manually before import.</p>
            </div>
            <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={validRows.length === 0 || isImporting} onClick={importRows} type="button">
              {isImporting ? "Importing..." : "Import valid rows"}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-[var(--background)] p-4"><p className="text-sm font-bold text-[var(--muted)]">Total events</p><p className="mt-1 text-3xl font-black">{rows.length}</p></div>
            <div className="rounded-lg bg-green-50 p-4"><p className="text-sm font-bold text-green-700">Valid rows</p><p className="mt-1 text-3xl font-black text-green-950">{validRows.length}</p></div>
            <div className="rounded-lg bg-red-50 p-4"><p className="text-sm font-bold text-red-700">Invalid rows</p><p className="mt-1 text-3xl font-black text-red-950">{invalidRows.length}</p></div>
            <div className="rounded-lg bg-amber-50 p-4"><p className="text-sm font-bold text-amber-900">Duplicates skipped</p><p className="mt-1 text-3xl font-black text-amber-950">{duplicateRows.length + (summary?.skipped ?? 0)}</p></div>
          </div>

          <div className="grid gap-4">
            {validatedRows.slice(0, 100).map((item, index) => (
              <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={`${item.row.sourceId}-${index}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{formatDateTime(item.row.startTime)}</p>
                    <h4 className="mt-1 text-lg font-black">{item.row.title}</h4>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{item.row.location || "No location in feed"}</p>
                  </div>
                  {item.errors.length > 0 ? <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-red-800">Needs review</p> : <p className="rounded-md bg-green-50 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-green-800">Ready</p>}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold">Venue</span>
                    <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => updateRow(index, { venueId: event.target.value })} value={item.row.venueId}>
                      <option value="">Choose venue</option>
                      {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-bold">Field</span>
                    <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => updateRow(index, { fieldId: event.target.value })} value={item.row.fieldId}>
                      <option value="">Choose field</option>
                      {(fieldsByVenueId.get(item.row.venueId) ?? []).map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-bold">Sport</span>
                    <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => updateRow(index, { sportType: event.target.value as SessionSportType })} value={item.row.sportType}>
                      {sportTypes.map((sport) => <option key={sport} value={sport}>{sport}</option>)}
                    </select>
                  </label>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Session Teams</p>
                    <p className="mt-1 text-sm font-black">{item.row.homeTeam} vs. {item.row.awayTeam}</p>
                  </div>
                </div>
                {item.row.description ? <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.row.description}</p> : null}
                {item.errors.length > 0 ? (
                  <ul className="mt-3 grid gap-1 text-sm font-semibold text-red-700">
                    {item.errors.map((error) => <li key={error}>{error}</li>)}
                  </ul>
                ) : null}
                {item.row.venueId ? <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{venuesById.get(item.row.venueId)?.name}</p> : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {summary ? (
        <div className="mt-6 rounded-lg border border-[var(--line)] bg-white p-5">
          <h3 className="text-lg font-black">Import summary</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-green-50 p-4"><p className="text-sm font-bold text-green-700">Sessions created</p><p className="mt-1 text-3xl font-black text-green-950">{summary.created}</p></div>
            <div className="rounded-lg bg-amber-50 p-4"><p className="text-sm font-bold text-amber-900">Skipped</p><p className="mt-1 text-3xl font-black text-amber-950">{summary.skipped}</p></div>
            <div className="rounded-lg bg-red-50 p-4"><p className="text-sm font-bold text-red-700">Errors</p><p className="mt-1 text-3xl font-black text-red-950">{summary.errors.length}</p></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
