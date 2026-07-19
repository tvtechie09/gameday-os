"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { parseScheduleCsv, validateScheduleRows } from "@/lib/schedule-import";
import { importScheduleAction, type ImportResult } from "./actions";

export function ScheduleImportTool({ fields, venues }: { fields: Array<{ id: string; name: string; venueId: string }>; venues: Array<{ id: string; name: string }> }) {
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "");
  const [csv, setCsv] = useState("");
  const [defaultDate, setDefaultDate] = useState(new Date().toISOString().slice(0, 10));
  const [gameMinutes, setGameMinutes] = useState(90);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsed = useMemo(() => parseScheduleCsv(csv), [csv]);
  const validated = useMemo(
    // Scope name->field matching to the chosen venue so identically-named fields
    // ("Field 1") across venues can't be mismatched.
    () => validateScheduleRows(parsed.rows, fields, { defaultDate, gameMinutes, venueId }),
    [parsed.rows, fields, defaultDate, gameMinutes, venueId]
  );
  const ready = validated.filter((row) => !row.errors.length);
  const failed = validated.filter((row) => row.errors.length);

  const runImport = () => {
    const formData = new FormData();
    formData.set("rows", JSON.stringify(parsed.rows));
    formData.set("default_date", defaultDate);
    formData.set("game_minutes", String(gameMinutes));
    formData.set("venue_id", venueId);
    startTransition(async () => {
      setResult(await importScheduleAction(formData));
    });
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-lg font-black">1. Which venue is this schedule for?</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Field names are matched inside this venue, so a &ldquo;Field 1&rdquo; here can never collide with another venue&rsquo;s.</p>
        <select
          className="mt-3 min-h-11 w-full max-w-md rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold outline-none focus:border-[var(--accent)]"
          onChange={(event) => { setVenueId(event.target.value); setResult(null); }}
          value={venueId}
        >
          {venues.length === 0 ? <option value="">No venues found</option> : null}
          {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
        </select>
      </section>

      <section className="rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-lg font-black">2. Paste your schedule CSV</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Works with exports from tournament and league tools. Recognized columns: date, time, field, home, away, title, sport. Field names must match your fields in GameDay OS.
        </p>
        <textarea
          className="mt-3 min-h-44 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] p-3 font-mono text-xs outline-none focus:border-[var(--accent)] focus:bg-white"
          onChange={(event) => { setCsv(event.target.value); setResult(null); }}
          placeholder={"date,time,field,home,away\n2026-07-18,9:00 AM,Field 1,Celtics 10U,Panthers 10U\n2026-07-18,10:45 AM,Field 1,Cubs 11U,Saints 11U"}
          value={csv}
        />
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            Default date (when the CSV has no date column)
            <input className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold normal-case tracking-normal" onChange={(event) => setDefaultDate(event.target.value)} type="date" value={defaultDate} />
          </label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            Game length (minutes)
            <input className="min-h-10 w-28 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" min={30} max={240} onChange={(event) => setGameMinutes(Number(event.target.value) || 90)} type="number" value={gameMinutes} />
          </label>
        </div>
        {parsed.error && csv.trim() ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-900">{parsed.error}</p> : null}
        {parsed.unknownHeaders.length ? <p className="mt-3 text-xs font-semibold text-[var(--muted)]">Ignored columns: {parsed.unknownHeaders.join(", ")}</p> : null}
      </section>

      {validated.length ? (
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-lg font-black">3. Review {validated.length} game{validated.length === 1 ? "" : "s"}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{ready.length} ready · {failed.length} need attention</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="py-2 pr-3">Row</th><th className="py-2 pr-3">When</th><th className="py-2 pr-3">Field</th><th className="py-2 pr-3">Matchup</th><th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {validated.slice(0, 50).map((row) => (
                  <tr key={row.rowNumber} className="border-b border-[var(--line)]/60">
                    <td className="py-2 pr-3 font-bold">{row.rowNumber}</td>
                    <td className="py-2 pr-3">{row.startTime ? new Date(row.startTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</td>
                    <td className="py-2 pr-3">{row.fieldName}</td>
                    <td className="py-2 pr-3">{row.title || row.homeTeam + " vs " + row.awayTeam}</td>
                    <td className="py-2">{row.errors.length ? <span className="font-bold text-red-700">{row.errors.join("; ")}</span> : <span className="font-bold text-green-700">Ready</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={isPending || !ready.length} onClick={runImport} type="button">
              {isPending ? "Importing..." : "Import " + ready.length + " game" + (ready.length === 1 ? "" : "s")}
            </button>
            <Link className="text-sm font-bold text-[var(--accent-strong)] underline" href="/admin/sessions">Back to Schedule &amp; Games</Link>
          </div>
        </section>
      ) : null}

      {result ? (
        <section className={result.error ? "rounded-lg border border-red-200 bg-red-50 p-5" : "rounded-lg border border-green-200 bg-green-50 p-5"}>
          {result.error ? <p className="font-bold text-red-800">{result.error}</p> : (
            <>
              <p className="font-black text-green-900">{result.created} game{result.created === 1 ? "" : "s"} imported{result.skipped ? " · " + result.skipped + " skipped" : ""}.</p>
              {result.errors?.length ? <ul className="mt-2 list-disc pl-5 text-sm font-semibold text-red-800">{result.errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}
              <Link className="mt-3 inline-block text-sm font-bold text-green-900 underline" href="/admin/sessions">See them on Schedule &amp; Games</Link>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
