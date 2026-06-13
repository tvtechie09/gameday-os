"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Field, Session, Venue } from "@/lib/types";
import { fetchCalendarEventsAction, importExternalSessionsAction, type CalendarEventPreview, type ExternalImportResult, type ExternalImportRow } from "./actions";

type EditableEvent = CalendarEventPreview & {
  venueId: string;
  fieldId: string;
};

type SavedSource = {
  name: string;
  url: string;
};

type IntegrationClientProps = {
  fields: Field[];
  sessions: Session[];
  venues: Venue[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalize(value: string) {
  return value.trim().toLowerCase();
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

function guessVenueId(event: CalendarEventPreview, venues: Venue[]) {
  const searchable = normalize(`${event.location} ${event.description} ${event.title}`);
  return venues.find((venue) => searchable.includes(normalize(venue.name)))?.id ?? venues[0]?.id ?? "";
}

function guessFieldId(event: CalendarEventPreview, fields: Field[], venueId: string) {
  const searchable = normalize(`${event.location} ${event.description} ${event.title}`);
  const venueFields = fields.filter((field) => field.venueId === venueId);
  return venueFields.find((field) => searchable.includes(normalize(field.name)))?.id ?? venueFields[0]?.id ?? "";
}

function buildRows(events: CalendarEventPreview[], venues: Venue[], fields: Field[]) {
  return events.map((event) => {
    const venueId = guessVenueId(event, venues);
    return {
      ...event,
      fieldId: guessFieldId(event, fields, venueId),
      venueId,
    };
  });
}

function buildImportRow(row: EditableEvent, sourceName: string, sourceUrl: string): ExternalImportRow | null {
  if (!row.fieldId || !row.title.trim() || !row.homeTeam.trim() || !row.awayTeam.trim()) {
    return null;
  }

  const startTime = new Date(row.startTime);
  if (Number.isNaN(startTime.getTime())) {
    return null;
  }

  return {
    awayTeam: row.awayTeam.trim(),
    endTime: row.endTime,
    externalSource: sourceName.trim() || "iCal / Calendar URL",
    externalSourceId: row.sourceId || `${sourceUrl}|${row.startTime}|${row.title}`,
    externalSourceUrl: row.url || sourceUrl,
    fieldId: row.fieldId,
    homeTeam: row.homeTeam.trim(),
    notes: row.notes,
    startTime: startTime.toISOString(),
    title: row.title.trim(),
  };
}

function getRowErrors(row: EditableEvent) {
  const errors: string[] = [];
  if (!row.venueId) errors.push("Choose venue");
  if (!row.fieldId) errors.push("Choose field");
  if (!row.title.trim()) errors.push("Missing title");
  if (!row.homeTeam.trim()) errors.push("Missing home team");
  if (!row.awayTeam.trim()) errors.push("Missing away team");
  if (Number.isNaN(new Date(row.startTime).getTime())) errors.push("Invalid start time");
  return errors;
}

function SourceSetupCard({ label, savedSources, setSavedSources }: { label: string; savedSources: SavedSource[]; setSavedSources: (sources: SavedSource[]) => void }) {
  const [name, setName] = useState(label);
  const [url, setUrl] = useState("");

  function saveSource() {
    if (!name.trim() || !url.trim()) return;
    setSavedSources([...savedSources, { name: name.trim(), url: url.trim() }]);
    setUrl("");
  }

  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Placeholder</p>
      <h3 className="mt-2 text-lg font-black">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use CSV export or calendar feed URL for now.</p>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-2">
          <span className="text-sm font-bold">External source name</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => setName(event.target.value)} value={name} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">External source URL</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => setUrl(event.target.value)} placeholder="https://..." value={url} />
        </label>
        <button className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold" onClick={saveSource} type="button">
          Save source reference
        </button>
      </div>
    </article>
  );
}

export function IntegrationsClient({ fields, sessions, venues }: IntegrationClientProps) {
  const [sourceName, setSourceName] = useState("iCal / Calendar URL");
  const [sourceUrl, setSourceUrl] = useState("");
  const [rows, setRows] = useState<EditableEvent[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<ExternalImportResult | null>(null);
  const [savedSources, setSavedSources] = useState<SavedSource[]>([]);

  const fieldsByVenue = useMemo(() => new Map(venues.map((venue) => [venue.id, fields.filter((field) => field.venueId === venue.id)])), [fields, venues]);
  const existingExternalKeys = useMemo(() => new Set(sessions.flatMap((session) => (session.externalSource && session.externalSourceId ? [`${session.externalSource}|${session.externalSourceId}`] : []))), [sessions]);
  const existingSessionKeys = useMemo(() => new Set(sessions.map((session) => duplicateKey({
    awayTeam: session.awayTeam,
    fieldId: session.fieldId,
    homeTeam: session.homeTeam,
    startTime: session.startTime,
    title: session.title,
  }))), [sessions]);

  const validatedRows = useMemo(() => rows.map((row) => {
    const errors = getRowErrors(row);
    const importRow = buildImportRow(row, sourceName, sourceUrl);
    const sourceKey = importRow ? `${importRow.externalSource}|${importRow.externalSourceId}` : "";
    const sessionKey = importRow ? duplicateKey(importRow) : "";
    const duplicate = Boolean(importRow && (existingExternalKeys.has(sourceKey) || existingSessionKeys.has(sessionKey)));

    return {
      duplicate,
      errors: duplicate ? [...errors, "Duplicate external event"] : errors,
      importRow,
      row,
    };
  }), [existingExternalKeys, existingSessionKeys, rows, sourceName, sourceUrl]);

  const validRows = validatedRows.filter((row) => row.importRow && row.errors.length === 0);
  const invalidRows = validatedRows.filter((row) => !row.importRow || row.errors.length > 0);

  async function fetchEvents() {
    if (!sourceUrl.trim() || isFetching) return;
    setIsFetching(true);
    setErrorMessage(null);
    setSummary(null);
    const result = await fetchCalendarEventsAction(sourceUrl);
    setIsFetching(false);

    if (result.error) {
      setRows([]);
      setErrorMessage(result.error);
      return;
    }

    setRows(buildRows(result.events, venues, fields));
  }

  async function importRows() {
    if (validRows.length === 0 || isImporting) return;
    setIsImporting(true);
    setSummary(await importExternalSessionsAction(validRows.flatMap((row) => (row.importRow ? [row.importRow] : []))));
    setIsImporting(false);
  }

  function updateRow(index: number, updates: Partial<EditableEvent>) {
    setRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next = { ...row, ...updates };
      if (updates.venueId) {
        next.fieldId = fieldsByVenue.get(updates.venueId)?.[0]?.id ?? "";
      }
      return next;
    }));
  }

  return (
    <div className="mt-8 grid gap-6">
      <section className="grid gap-4 lg:grid-cols-5">
        <Link href="/admin/import" className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Source</p>
          <h2 className="mt-2 text-lg font-black">CSV Upload</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use the existing CSV import wizard.</p>
        </Link>
        {["iCal / Calendar URL", "SportsEngine Placeholder", "HomeTeamsOnline Placeholder", "Other"].map((source) => (
          <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={source}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Source</p>
            <h2 className="mt-2 text-lg font-black">{source}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{source === "iCal / Calendar URL" ? "Fetch public calendar feeds." : "Save a reference and import via CSV/feed for now."}</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-[var(--line)] bg-white p-5">
        <div>
          <h2 className="text-xl font-black">iCal / Calendar URL import</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Enter a public `.ics` or calendar feed URL, preview events, map them to existing venues and fields, then import sessions.</p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_2fr_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="text-sm font-bold">External source name</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => setSourceName(event.target.value)} value={sourceName} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Calendar feed URL</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://example.com/schedule.ics" value={sourceUrl} />
          </label>
          <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={!sourceUrl.trim() || isFetching} onClick={fetchEvents} type="button">
            {isFetching ? "Fetching..." : "Fetch events"}
          </button>
        </div>
        {errorMessage ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-900">{errorMessage}</p>
          </div>
        ) : null}
      </section>

      {rows.length > 0 ? (
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black">Preview and map events</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Calendar imports create sessions only. Venues and fields must already exist.</p>
            </div>
            <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={validRows.length === 0 || isImporting} onClick={importRows} type="button">
              {isImporting ? "Importing..." : "Import valid events"}
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[var(--background)] p-4"><p className="text-sm font-bold text-[var(--muted)]">Total events</p><p className="mt-1 text-3xl font-black">{rows.length}</p></div>
            <div className="rounded-lg bg-green-50 p-4"><p className="text-sm font-bold text-green-700">Valid events</p><p className="mt-1 text-3xl font-black text-green-950">{validRows.length}</p></div>
            <div className="rounded-lg bg-red-50 p-4"><p className="text-sm font-bold text-red-700">Needs review</p><p className="mt-1 text-3xl font-black text-red-950">{invalidRows.length}</p></div>
          </div>
          <div className="mt-5 grid gap-4">
            {validatedRows.slice(0, 100).map((item, index) => (
              <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={`${item.row.sourceId}-${index}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{formatDateTime(item.row.startTime)}</p>
                    <h3 className="mt-1 text-lg font-black">{item.row.title}</h3>
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
                      {(fieldsByVenue.get(item.row.venueId) ?? []).map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-bold">Home team</span>
                    <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => updateRow(index, { homeTeam: event.target.value })} value={item.row.homeTeam} />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-bold">Away team</span>
                    <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => updateRow(index, { awayTeam: event.target.value })} value={item.row.awayTeam} />
                  </label>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold">Session title</span>
                    <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => updateRow(index, { title: event.target.value })} value={item.row.title} />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-bold">Notes</span>
                    <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => updateRow(index, { notes: event.target.value })} value={item.row.notes ?? ""} />
                  </label>
                </div>
                {item.errors.length > 0 ? (
                  <ul className="mt-3 grid gap-1 text-sm font-semibold text-red-700">
                    {item.errors.map((error) => <li key={error}>{error}</li>)}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {summary ? (
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-xl font-black">Import summary</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-green-50 p-4"><p className="text-sm font-bold text-green-700">Sessions created</p><p className="mt-1 text-3xl font-black text-green-950">{summary.created}</p></div>
            <div className="rounded-lg bg-[var(--background)] p-4"><p className="text-sm font-bold text-[var(--muted)]">Sessions skipped</p><p className="mt-1 text-3xl font-black">{summary.skipped}</p></div>
            <div className="rounded-lg bg-red-50 p-4"><p className="text-sm font-bold text-red-700">Errors</p><p className="mt-1 text-3xl font-black text-red-950">{summary.errors.length}</p></div>
          </div>
          {summary.errors.length > 0 ? (
            <ul className="mt-4 grid gap-2 text-sm font-semibold text-red-700">
              {summary.errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <SourceSetupCard label="SportsEngine" savedSources={savedSources} setSavedSources={setSavedSources} />
        <SourceSetupCard label="HomeTeamsOnline" savedSources={savedSources} setSavedSources={setSavedSources} />
      </section>

      {savedSources.length > 0 ? (
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-xl font-black">Saved source references</h2>
          <div className="mt-4 grid gap-3">
            {savedSources.map((source) => (
              <div className="rounded-lg bg-[var(--background)] p-4" key={`${source.name}-${source.url}`}>
                <p className="text-sm font-black">{source.name}</p>
                <p className="mt-1 break-all text-xs font-semibold text-[var(--muted)]">{source.url}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
