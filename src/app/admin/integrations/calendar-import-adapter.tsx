"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getExternalSourceTypeLabel } from "@/lib/services/external-sources";
import type { ExternalSource, Field, Session, SessionSportType, Venue } from "@/lib/types";
import { fetchCalendarEventsAction, importCalendarSessionsAction, type CalendarImportEvent, type CalendarImportRow, type ImportCalendarResult } from "./import-actions";

type EditableCalendarRow = CalendarImportEvent & {
  fieldId: string;
  venueId: string;
  sportType: SessionSportType;
};

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
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function findExactField(event: CalendarImportEvent, fields: Field[]) {
  const location = normalize(event.location);
  if (!location) return null;
  return fields.find((field) => normalize(field.name) === location) ?? null;
}

function buildRows(events: CalendarImportEvent[], fields: Field[]) {
  return events.map((event) => {
    const field = findExactField(event, fields);
    return {
      ...event,
      fieldId: field?.id ?? "",
      sportType: "baseball" as SessionSportType,
      venueId: field?.venueId ?? "",
    };
  });
}

function getRowErrors(row: EditableCalendarRow) {
  const errors: string[] = [];

  if (!row.fieldId) errors.push("Field location did not exactly match an existing field");
  if (!row.venueId) errors.push("Choose venue");
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
  const importableSources = sources.filter((source) => source.sourceType === "ical" || source.sourceType === "hometeamsonline" || source.sourceType === "other");
  const defaultSourceId = importableSources[0]?.id ?? "";
  const [sourceId, setSourceId] = useState(defaultSourceId);
  const selectedSource = sources.find((source) => source.id === sourceId) ?? null;
  const [feedUrl, setFeedUrl] = useState(selectedSource?.sourceUrl ?? "");
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
    const externalSourceName = selectedSource?.sourceName ?? "";
    const duplicate = Boolean(externalSourceName && externalKeys.has(`${externalSourceName}|${row.sourceId}`));
    return {
      duplicate,
      errors: duplicate ? [...errors, "Duplicate external event"] : errors,
      importRow: duplicate ? null : buildImportRow(row),
      row,
    };
  }), [externalKeys, rows, selectedSource?.sourceName]);

  const validRows = validatedRows.filter((row) => row.importRow);
  const duplicateRows = validatedRows.filter((row) => row.duplicate);
  const invalidRows = validatedRows.filter((row) => row.errors.length > 0 && !row.duplicate);

  function handleSourceChange(nextSourceId: string) {
    const nextSource = sources.find((source) => source.id === nextSourceId) ?? null;
    setSourceId(nextSourceId);
    setFeedUrl(nextSource?.sourceUrl ?? "");
    setRows([]);
    setSummary(null);
    setErrorMessage(null);
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

    setRows(buildRows(result.events, fields));
  }

  async function importRows() {
    if (!selectedSource || validRows.length === 0 || isImporting) return;
    setIsImporting(true);
    setSummary(await importCalendarSessionsAction({
      feedUrl,
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
          <h2 className="mt-2 text-xl font-black">HomeTeamsOnline / iCal import</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Fetch a public calendar feed, preview events, map them to existing venue fields, and import scheduled sessions without credentials.
          </p>
        </div>
        <Link href="/admin/import" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
          CSV import
        </Link>
      </div>

      {importableSources.length === 0 ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-950">Create an iCal, HomeTeamsOnline, or Other integration source before importing a feed.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_2fr_auto] lg:items-end">
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
            <label className="grid gap-2">
              <span className="text-sm font-bold">Calendar/feed URL</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => setFeedUrl(event.target.value)} placeholder="https://example.com/schedule.ics" value={feedUrl} />
            </label>
            <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={!feedUrl.trim() || isFetching} onClick={fetchEvents} type="button">
              {isFetching ? "Fetching..." : "Fetch events"}
            </button>
          </div>
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
