"use client";

import { useState, useTransition } from "react";
import { assignOfficialAction, type AssignOfficialResult } from "./actions";

type SessionOption = { id: string; label: string; when: string };

export function AssignOfficialForm({ sessions }: { sessions: SessionOption[] }) {
  const [result, setResult] = useState<AssignOfficialResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-5"
      action={(formData) => {
        startTransition(async () => {
          const next = await assignOfficialAction(formData);
          setResult(next);
          if (next.ok) {
            (document.getElementById("assign-official-form") as HTMLFormElement | null)?.reset();
          }
        });
      }}
      id="assign-official-form"
    >
      <h2 className="text-lg font-black">Assign an official</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold sm:col-span-2">
          Game
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" name="sessionId" required>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.when} — {session.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Official&apos;s name
          <input className="min-h-11 rounded-lg border border-[var(--line)] px-3" name="name" required />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Role
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" defaultValue="umpire" name="role">
            <option value="umpire">Umpire</option>
            <option value="base umpire">Base umpire</option>
            <option value="referee">Referee</option>
            <option value="scorekeeper">Scorekeeper</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Email (optional — sends the confirm link)
          <input className="min-h-11 rounded-lg border border-[var(--line)] px-3" name="email" type="email" />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Mobile (optional — weather-hold texts)
          <input className="min-h-11 rounded-lg border border-[var(--line)] px-3" name="phone" type="tel" placeholder="+1 555 123 4567" />
        </label>
      </div>
      <button className="min-h-12 w-fit rounded-lg bg-[var(--accent)] px-6 text-sm font-black text-white disabled:opacity-50" disabled={pending} type="submit">
        {pending ? "Assigning…" : "Assign"}
      </button>
      {result?.error ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800">{result.error}</p> : null}
      {result?.ok ? (
        <div className="grid gap-2">
          {result.conflicts && result.conflicts.length > 0 ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-900">
              Heads up — this official is also assigned near this time: {result.conflicts.join("; ")}.
            </p>
          ) : null}
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
            <span className="font-black">Assigned.</span> Confirm link (also emailed when an address was given):{" "}
            <span className="break-all font-mono text-xs">{result.confirmUrl}</span>
          </p>
        </div>
      ) : null}
    </form>
  );
}
