"use client";

import { useState, useTransition } from "react";
import { createBookingAction, type CreateBookingResult } from "./actions";

type FieldOption = { id: string; name: string; venueName: string };

const PURPOSES = ["permit", "practice", "camp", "clinic", "tournament", "maintenance hold", "other"];

export function BookingForm({ fields }: { fields: FieldOption[] }) {
  const [result, setResult] = useState<CreateBookingResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-5"
      action={(formData) => {
        startTransition(async () => {
          const next = await createBookingAction(formData);
          setResult(next);
          if (next.ok) {
            const form = document.getElementById("booking-form") as HTMLFormElement | null;
            form?.reset();
          }
        });
      }}
      id="booking-form"
    >
      <h2 className="text-lg font-black">Reserve field time</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold">
          Field
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" name="fieldId" required>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.venueName} — {field.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Group / permit holder
          <input className="min-h-11 rounded-lg border border-[var(--line)] px-3" name="organizationName" placeholder="New Lenox Travel 12U" required />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Purpose
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" name="purpose">
            {PURPOSES.map((purpose) => (
              <option key={purpose} value={purpose}>
                {purpose}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Date
          <input className="min-h-11 rounded-lg border border-[var(--line)] px-3" name="date" required type="date" />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Start
          <input className="min-h-11 rounded-lg border border-[var(--line)] px-3" name="startTime" required type="time" />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          End
          <input className="min-h-11 rounded-lg border border-[var(--line)] px-3" name="endTime" required type="time" />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Contact name (optional)
          <input className="min-h-11 rounded-lg border border-[var(--line)] px-3" name="contactName" />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Contact email (optional)
          <input className="min-h-11 rounded-lg border border-[var(--line)] px-3" name="contactEmail" type="email" />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-bold">
        Notes (optional)
        <textarea className="min-h-20 rounded-lg border border-[var(--line)] px-3 py-2" name="notes" />
      </label>
      <button className="min-h-12 rounded-lg bg-[var(--accent)] px-6 text-sm font-black text-white disabled:opacity-50" disabled={pending} type="submit">
        {pending ? "Saving…" : "Reserve time"}
      </button>
      {result?.error ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800">{result.error}</p> : null}
      {result?.ok ? (
        result.conflicts && result.conflicts.length > 0 ? (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-black">Booked, but this overlaps {result.conflicts.length} existing use{result.conflicts.length === 1 ? "" : "s"} of the field:</p>
            <ul className="mt-1 list-disc pl-5">
              {result.conflicts.map((conflict, index) => (
                <li key={index}>
                  {conflict.label} — {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(conflict.startsAt))}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-lg bg-green-50 p-3 text-sm font-bold text-green-800">Booked — no conflicts on that field.</p>
        )
      ) : null}
    </form>
  );
}
