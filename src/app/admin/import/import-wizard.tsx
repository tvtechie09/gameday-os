"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import type { Field, Session, SessionLinkLabel, Venue } from "@/lib/types";
import { importSessionsAction, type ImportSessionRow, type ImportSessionsResult } from "./actions";

type CsvRow = Record<string, string>;
type AppColumn =
  | "venue"
  | "field"
  | "title"
  | "date"
  | "time"
  | "homeTeam"
  | "awayTeam"
  | "status"
  | "primaryLinkLabel"
  | "primaryLinkUrl"
  | "secondaryLinkLabel"
  | "secondaryLinkUrl"
  | "notes";

type ValidatedRow = {
  errors: string[];
  importRow: ImportSessionRow | null;
  raw: CsvRow;
  rowNumber: number;
};

const appColumns: Array<{ key: AppColumn; label: string; required?: boolean }> = [
  { key: "venue", label: "Venue", required: true },
  { key: "field", label: "Field", required: true },
  { key: "title", label: "Session Title", required: true },
  { key: "date", label: "Date", required: true },
  { key: "time", label: "Time", required: true },
  { key: "homeTeam", label: "Home Team", required: true },
  { key: "awayTeam", label: "Away Team", required: true },
  { key: "status", label: "Status", required: true },
  { key: "primaryLinkLabel", label: "Primary Link Label" },
  { key: "primaryLinkUrl", label: "Primary Link URL" },
  { key: "secondaryLinkLabel", label: "Secondary Link Label" },
  { key: "secondaryLinkUrl", label: "Secondary Link URL" },
  { key: "notes", label: "Notes" },
];

const sampleCsv = `# Venue and field names must match existing GameDay OS records exactly.
Venue,Field,Session Title,Date,Time,Home Team,Away Team,Status,Primary Link Label,Primary Link URL,Secondary Link Label,Secondary Link URL,Notes
Example Sports Complex,Field 1,Pool Play Game,2026-07-12,09:00 AM,Home Team,Away Team,scheduled,GameChanger,https://example.com/gamechanger,YouTube,https://example.com/stream,Bring chairs`;

const linkLabels = ["GameChanger", "SidelineHD", "YouTube", "SportsEngine", "TeamSnap", "Other"] as const;

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

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function normalizeHeader(value: string) {
  return normalize(value).replace(/[^a-z0-9]/g, "");
}

function guessMapping(headers: string[]) {
  const mapping: Partial<Record<AppColumn, string>> = {};
  const guesses: Record<AppColumn, string[]> = {
    awayTeam: ["awayteam", "away"],
    date: ["date", "gamedate"],
    field: ["field", "fieldname"],
    homeTeam: ["hometeam", "home"],
    notes: ["notes", "gamenotes"],
    primaryLinkLabel: ["primarylinklabel"],
    primaryLinkUrl: ["primarylinkurl", "primaryurl"],
    secondaryLinkLabel: ["secondarylinklabel"],
    secondaryLinkUrl: ["secondarylinkurl", "secondaryurl"],
    status: ["status", "gamestatus"],
    time: ["time", "starttime"],
    title: ["sessiontitle", "title", "gametitle"],
    venue: ["venue", "venuename"],
  };

  for (const column of appColumns) {
    const header = headers.find((candidate) => guesses[column.key].includes(normalizeHeader(candidate)));
    if (header) mapping[column.key] = header;
  }

  return mapping;
}

function distance(a: string, b: string) {
  const source = normalize(a);
  const target = normalize(b);
  const matrix = Array.from({ length: source.length + 1 }, (_, row) =>
    Array.from({ length: target.length + 1 }, (_, column) => (row === 0 ? column : column === 0 ? row : 0)),
  );

  for (let row = 1; row <= source.length; row += 1) {
    for (let column = 1; column <= target.length; column += 1) {
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + (source[row - 1] === target[column - 1] ? 0 : 1),
      );
    }
  }

  return matrix[source.length][target.length];
}

function closestNames(value: string, names: string[]) {
  if (!value || names.length === 0) return [];
  return names
    .map((name) => ({ name, score: distance(value, name) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .filter((match) => match.score <= Math.max(4, Math.ceil(value.length / 2)))
    .map((match) => match.name);
}

function parseDateTime(dateValue: string, timeValue: string) {
  const parsed = new Date(`${dateValue.trim()} ${timeValue.trim()}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseStatus(value: string): Session["status"] | null {
  const status = value.toLowerCase();
  return status === "active" || status === "final" || status === "scheduled" ? status : null;
}

function readCell(row: CsvRow, mapping: Partial<Record<AppColumn, string>>, key: AppColumn) {
  const header = mapping[key];
  return header ? row[header]?.trim() ?? "" : "";
}

function duplicateKey(row: Pick<ImportSessionRow, "awayTeam" | "fieldId" | "homeTeam" | "startTime" | "title">) {
  return [row.fieldId, row.title.toLowerCase(), row.homeTeam.toLowerCase(), row.awayTeam.toLowerCase(), new Date(row.startTime).toISOString()].join("|");
}

function validateRows({
  fields,
  mapping,
  rows,
  sessions,
  venues,
}: {
  fields: Field[];
  mapping: Partial<Record<AppColumn, string>>;
  rows: CsvRow[];
  sessions: Session[];
  venues: Venue[];
}): ValidatedRow[] {
  const venuesByName = new Map(venues.map((venue) => [normalize(venue.name), venue]));
  const fieldsByVenueAndName = new Map(fields.map((field) => [`${field.venueId}|${normalize(field.name)}`, field]));
  const existingKeys = new Set(sessions.map((session) => duplicateKey({
    awayTeam: session.awayTeam,
    fieldId: session.fieldId,
    homeTeam: session.homeTeam,
    startTime: session.startTime,
    title: session.title,
  })));
  const csvKeys = new Set<string>();

  return rows.map((row, index) => {
    const errors: string[] = [];
    const venueName = readCell(row, mapping, "venue");
    const fieldName = readCell(row, mapping, "field");
    const title = readCell(row, mapping, "title");
    const date = readCell(row, mapping, "date");
    const time = readCell(row, mapping, "time");
    const homeTeam = readCell(row, mapping, "homeTeam");
    const awayTeam = readCell(row, mapping, "awayTeam");
    const rawStatus = readCell(row, mapping, "status").toLowerCase();
    const primaryLinkLabel = readCell(row, mapping, "primaryLinkLabel");
    const secondaryLinkLabel = readCell(row, mapping, "secondaryLinkLabel");
    const parsedDate = parseDateTime(date, time);
    const venue = venuesByName.get(normalize(venueName));
    const field = venue ? fieldsByVenueAndName.get(`${venue.id}|${normalize(fieldName)}`) : null;
    const status = parseStatus(rawStatus);

    if (!venue) {
      const matches = closestNames(venueName, venues.map((item) => item.name));
      errors.push(`Missing venue${matches.length > 0 ? `; closest: ${matches.join(", ")}` : ""}`);
    }
    if (!field) {
      const fieldOptions = venue ? fields.filter((item) => item.venueId === venue.id).map((item) => item.name) : fields.map((item) => item.name);
      const matches = closestNames(fieldName, fieldOptions);
      errors.push(`Missing field${matches.length > 0 ? `; closest: ${matches.join(", ")}` : ""}`);
    }
    if (!title) errors.push("Missing session title");
    if (!parsedDate) errors.push("Invalid date/time");
    if (!homeTeam) errors.push("Missing home team");
    if (!awayTeam) errors.push("Missing away team");
    if (!status) errors.push("Invalid status");
    if (primaryLinkLabel && !linkLabels.includes(primaryLinkLabel as SessionLinkLabel)) errors.push("Invalid primary link label");
    if (secondaryLinkLabel && !linkLabels.includes(secondaryLinkLabel as SessionLinkLabel)) errors.push("Invalid secondary link label");

    const importRow = field && parsedDate && title && homeTeam && awayTeam && status
      ? {
        awayTeam,
        fieldId: field.id,
        homeTeam,
        notes: readCell(row, mapping, "notes") || null,
        primaryLinkLabel: primaryLinkLabel as SessionLinkLabel | "",
        primaryLinkUrl: readCell(row, mapping, "primaryLinkUrl") || null,
        secondaryLinkLabel: secondaryLinkLabel as SessionLinkLabel | "",
        secondaryLinkUrl: readCell(row, mapping, "secondaryLinkUrl") || null,
        startTime: parsedDate.toISOString(),
        status,
        title,
      }
      : null;

    if (importRow) {
      const key = duplicateKey(importRow);
      if (existingKeys.has(key) || csvKeys.has(key)) errors.push("Duplicate session");
      csvKeys.add(key);
    }

    return { errors, importRow: errors.length === 0 ? importRow : null, raw: row, rowNumber: index + 2 };
  });
}

export function ImportWizard({ fields, sessions, venues }: { fields: Field[]; sessions: Session[]; venues: Venue[] }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<AppColumn, string>>>({});
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSessionsResult | null>(null);
  const validatedRows = useMemo(() => validateRows({ fields, mapping, rows, sessions, venues }), [fields, mapping, rows, sessions, venues]);
  const validRows = validatedRows.filter((row) => row.importRow);
  const invalidRows = validatedRows.filter((row) => !row.importRow);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const parsed = parseCsv(await file.text());
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(guessMapping(parsed.headers));
    setFileName(file.name);
    setSummary(null);
  }

  async function handleImport() {
    if (validRows.length === 0 || isImporting) return;
    setIsImporting(true);
    setSummary(await importSessionsAction(validRows.flatMap((row) => (row.importRow ? [row.importRow] : []))));
    setIsImporting(false);
  }

  return (
    <div className="mt-8 grid gap-6">
      <section className="rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-xl font-black">Before importing</h2>
        <p className="mt-2 text-base font-bold text-[var(--foreground)]">Venues and fields must already exist before importing sessions.</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">CSV import creates sessions only. It will not create venues or fields, and names must match existing records exactly.</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg bg-[var(--background)] p-4">
            <h3 className="text-sm font-black">Existing venues</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {venues.map((venue) => <span key={venue.id} className="rounded-md bg-white px-2 py-1 text-xs font-bold">{venue.name}</span>)}
            </div>
          </div>
          <div className="rounded-lg bg-[var(--background)] p-4">
            <h3 className="text-sm font-black">Existing fields</h3>
            <div className="mt-3 grid gap-2">
              {fields.map((field) => {
                const venue = venues.find((item) => item.id === field.venueId);
                return <p key={field.id} className="text-xs font-semibold text-[var(--muted)]">{venue?.name ?? "Unknown venue"} / <span className="font-bold text-[var(--foreground)]">{field.name}</span></p>;
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-xl font-black">1. Upload CSV</h2>
        <div className="mt-4 grid gap-4">
          <input accept=".csv,text/csv" className="min-h-11 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 text-sm font-semibold" onChange={handleFileChange} type="file" />
          <a className="inline-flex min-h-10 w-fit items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold" download="gameday-os-session-import-sample.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(sampleCsv)}`}>
            Download sample CSV
          </a>
          {fileName ? <p className="text-sm font-semibold text-[var(--muted)]">Loaded {fileName}</p> : null}
        </div>
      </section>

      {headers.length > 0 ? (
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-xl font-black">2. Map columns</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {appColumns.map((column) => (
              <label key={column.key} className="grid gap-2">
                <span className="text-sm font-bold">{column.label} {column.required ? <span className="text-red-600">*</span> : null}</span>
                <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" onChange={(event) => setMapping((current) => ({ ...current, [column.key]: event.target.value || undefined }))} value={mapping[column.key] ?? ""}>
                  <option value="">Not mapped</option>
                  {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                </select>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {rows.length > 0 ? (
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black">3. Preview</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Review validation before creating sessions.</p>
            </div>
            <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={validRows.length === 0 || isImporting} onClick={handleImport} type="button">
              {isImporting ? "Importing..." : "Import valid rows"}
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[var(--background)] p-4"><p className="text-sm font-bold text-[var(--muted)]">Total rows</p><p className="mt-1 text-3xl font-black">{rows.length}</p></div>
            <div className="rounded-lg bg-green-50 p-4"><p className="text-sm font-bold text-green-700">Valid rows</p><p className="mt-1 text-3xl font-black text-green-950">{validRows.length}</p></div>
            <div className="rounded-lg bg-red-50 p-4"><p className="text-sm font-bold text-red-700">Invalid rows</p><p className="mt-1 text-3xl font-black text-red-950">{invalidRows.length}</p></div>
          </div>
          <div className="mt-5 max-h-[520px] overflow-auto rounded-lg border border-[var(--line)]">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-[var(--black-soft)] text-white"><tr><th className="p-3">Row</th><th className="p-3">Session</th><th className="p-3">Venue / Field</th><th className="p-3">Date / Time</th><th className="p-3">Validation</th></tr></thead>
              <tbody>
                {validatedRows.slice(0, 100).map((row) => (
                  <tr key={row.rowNumber} className="border-t border-[var(--line)] align-top">
                    <td className="p-3 font-bold">{row.rowNumber}</td>
                    <td className="p-3"><p className="font-bold">{readCell(row.raw, mapping, "title") || "Untitled"}</p><p className="text-[var(--muted)]">{readCell(row.raw, mapping, "homeTeam")} vs. {readCell(row.raw, mapping, "awayTeam")}</p></td>
                    <td className="p-3">{readCell(row.raw, mapping, "venue")} / {readCell(row.raw, mapping, "field")}</td>
                    <td className="p-3">{readCell(row.raw, mapping, "date")} {readCell(row.raw, mapping, "time")}</td>
                    <td className="p-3">{row.errors.length > 0 ? <ul className="grid gap-1 text-red-700">{row.errors.map((error) => <li key={error}>{error}</li>)}</ul> : <span className="font-bold text-green-700">Valid</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        </section>
      ) : null}
    </div>
  );
}
