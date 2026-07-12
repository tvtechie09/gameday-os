"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { scheduleRoundRobin, type RoundRobinTeam } from "@/lib/round-robin";
import { generateScheduleAction, type DivisionOption, type GenerateResult } from "./actions";

export function ScheduleGeneratorTool({ fields, divisions }: { fields: Array<{ id: string; name: string }>; divisions: DivisionOption[] }) {
  const [teamText, setTeamText] = useState("");
  const [seasonIdsByName, setSeasonIdsByName] = useState<Record<string, string>>({});
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [dates, setDates] = useState<string[]>(() => [new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10)]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [gameMinutes, setGameMinutes] = useState(90);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const teams: RoundRobinTeam[] = useMemo(
    () => teamText.split("\n").map((line) => line.trim()).filter(Boolean).map((name) => ({ name, teamSeasonId: seasonIdsByName[name] })),
    [teamText, seasonIdsByName]
  );
  const activeFields = fields.filter((field) => selectedFields.includes(field.id));
  const preview = useMemo(
    () => (teams.length >= 2 && activeFields.length && dates.length ? scheduleRoundRobin(teams, activeFields, dates, { startTime, endTime, gameMinutes }) : null),
    [teams, activeFields, dates, startTime, endTime, gameMinutes]
  );

  const loadDivision = (divisionId: string) => {
    const division = divisions.find((option) => option.id === divisionId);
    if (!division) return;
    setTeamText(division.teams.map((team) => team.name).join("\n"));
    setSeasonIdsByName(Object.fromEntries(division.teams.map((team) => [team.name, team.teamSeasonId])));
    setResult(null);
  };

  const generate = () => {
    const formData = new FormData();
    formData.set("teams", JSON.stringify(teams));
    formData.set("field_ids", JSON.stringify(selectedFields));
    formData.set("dates", JSON.stringify(dates));
    formData.set("start_time", startTime);
    formData.set("end_time", endTime);
    formData.set("game_minutes", String(gameMinutes));
    startTransition(async () => setResult(await generateScheduleAction(formData)));
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-lg font-black">1. Teams</h2>
        {divisions.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[var(--muted)]">Load from a GameDay Team division:</span>
            {divisions.map((division) => (
              <button key={division.id} type="button" className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-bold hover:border-[var(--accent)]" onClick={() => loadDivision(division.id)}>
                {division.name} ({division.teams.length})
              </button>
            ))}
          </div>
        ) : null}
        <textarea
          className="mt-3 min-h-32 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] p-3 text-sm font-semibold outline-none focus:border-[var(--accent)] focus:bg-white"
          onChange={(event) => { setTeamText(event.target.value); setResult(null); }}
          placeholder={"One team per line:\nCubs 10U\nHawks 10U\nPirates 10U\nSaints 10U"}
          value={teamText}
        />
      </section>

      <section className="rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-lg font-black">2. Fields, dates &amp; times</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {fields.map((field) => {
            const active = selectedFields.includes(field.id);
            return <button key={field.id} type="button" aria-pressed={active} className={`rounded-lg border px-3 py-2 text-sm font-bold ${active ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "border-[var(--line)]"}`} onClick={() => setSelectedFields((current) => active ? current.filter((id) => id !== field.id) : [...current, field.id])}>{field.name}</button>;
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Dates
            <div className="flex flex-wrap items-center gap-2">
              {dates.map((date, index) => <input key={index} className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" type="date" value={date} onChange={(event) => setDates((current) => current.map((item, i) => i === index ? event.target.value : item))} />)}
              <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-bold" onClick={() => setDates((current) => [...current, current[current.length - 1] || new Date().toISOString().slice(0, 10)])}>+ date</button>
              {dates.length > 1 ? <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-bold" onClick={() => setDates((current) => current.slice(0, -1))}>−</button> : null}
            </div>
          </label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">First game
            <input className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Day ends
            <input className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Game length (min)
            <input className="min-h-10 w-24 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" type="number" min={30} max={240} value={gameMinutes} onChange={(event) => setGameMinutes(Number(event.target.value) || 90)} />
          </label>
        </div>
      </section>

      {preview ? (
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-lg font-black">3. Preview — {preview.matches.length} game{preview.matches.length === 1 ? "" : "s"}{preview.unscheduled ? <span className="text-amber-700"> · {preview.unscheduled} don&apos;t fit (add dates, fields, or hours)</span> : null}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--line)] text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]"><th className="py-2 pr-3">Round</th><th className="py-2 pr-3">When</th><th className="py-2 pr-3">Field</th><th className="py-2">Matchup</th></tr></thead>
              <tbody>
                {preview.matches.slice(0, 60).map((match, index) => (
                  <tr key={index} className="border-b border-[var(--line)]/60">
                    <td className="py-2 pr-3 font-bold">{match.round}</td>
                    <td className="py-2 pr-3">{new Date(match.startTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                    <td className="py-2 pr-3">{match.fieldName}</td>
                    <td className="py-2 font-bold">{match.home.name} vs {match.away.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className="min-h-11 rounded-lg bg-[var(--accent)] px-5 text-sm font-black text-white disabled:opacity-50" disabled={isPending || !preview.matches.length} onClick={generate}>
              {isPending ? "Creating games..." : "Create " + preview.matches.length + " games"}
            </button>
            <Link className="text-sm font-bold text-[var(--accent-strong)] underline" href="/admin/sessions">Back to Schedule &amp; Games</Link>
          </div>
        </section>
      ) : null}

      {result ? (
        <section className={result.error ? "rounded-lg border border-red-200 bg-red-50 p-5" : "rounded-lg border border-green-200 bg-green-50 p-5"}>
          {result.error ? <p className="font-bold text-red-800">{result.error}</p> : <p className="font-black text-green-900">{result.created} games created{result.unscheduled ? " · " + result.unscheduled + " did not fit" : ""}. Division teams are linked — standings and family calendars update automatically.</p>}
        </section>
      ) : null}
    </div>
  );
}
