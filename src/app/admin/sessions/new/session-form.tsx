"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Field, Tournament, Venue } from "@/lib/types";
import { createSessionAction } from "./actions";

type Message = { kind: "success" | "error"; text: string };

const sportTypes = ["baseball", "softball", "soccer", "football", "lacrosse", "basketball", "volleyball", "other"] as const;
const linkLabels = ["GameChanger", "SidelineHD", "YouTube", "SportsEngine", "TeamSnap", "Other"] as const;
const controlClass = "min-h-12 min-w-0 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]";

export function SessionForm({ fields, tournaments, venues }: { fields: Field[]; tournaments: Tournament[]; venues: Venue[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const initialVenueId = venues.length === 1 ? venues[0].id : "";
  const [selectedVenueId, setSelectedVenueId] = useState(initialVenueId);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const availableFields = useMemo(() => fields.filter((field) => field.venueId === selectedVenueId), [fields, selectedVenueId]);
  const canSubmit = venues.length > 0 && availableFields.length > 0 && !isSaving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSaving(true);
    setMessage(null);
    const result = await createSessionAction(new FormData(event.currentTarget)).catch((error: unknown) => ({
      error: error instanceof Error ? error.message : "Unable to create game.",
    }));
    if (result.error) {
      setMessage({ kind: "error", text: result.error });
      setIsSaving(false);
      return;
    }
    setMessage({ kind: "success", text: "Game created. Opening the schedule..." });
    formRef.current?.reset();
    router.push("/admin/sessions");
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-8 grid min-w-0 gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-6">
      {message ? <div className={message.kind === "success" ? "rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800" : "rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"} role={message.kind === "error" ? "alert" : "status"}>{message.text}</div> : null}
      {venues.length === 0 ? <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4 text-sm font-semibold text-[var(--muted)]">Create a venue before adding games.</div> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2"><span className="text-sm font-bold">Venue</span><select className={controlClass} disabled={venues.length === 0 || isSaving} onChange={(event) => setSelectedVenueId(event.target.value)} required value={selectedVenueId}><option value="">Select a venue</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label>
        <label className="grid gap-2"><span className="text-sm font-bold">Field</span><select className={controlClass} disabled={!selectedVenueId || availableFields.length === 0 || isSaving} name="field_id" required><option value="">{selectedVenueId ? "Select a field" : "Select a venue first"}</option>{availableFields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label>
      </div>

      <label className="grid gap-2"><span className="text-sm font-bold">Game or event name</span><input className={controlClass} disabled={isSaving} name="title" placeholder="Pool play game" required type="text" /></label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2"><span className="text-sm font-bold">Home team</span><input className={controlClass} disabled={isSaving} name="home_team" placeholder="Home team" required type="text" /></label>
        <label className="grid gap-2"><span className="text-sm font-bold">Away team</span><input className={controlClass} disabled={isSaving} name="away_team" placeholder="Away team" required type="text" /></label>
      </div>
      <label className="grid gap-2"><span className="text-sm font-bold">Start date and time</span><input className={controlClass} disabled={isSaving} name="start_time" required type="datetime-local" /></label>

      <details className="group rounded-lg border border-[var(--line)] bg-[var(--background)]">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-extrabold text-[var(--accent-strong)]">Advanced game details <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span></summary>
        <div className="grid gap-5 border-t border-[var(--line)] p-4">
          <p className="text-sm leading-6 text-[var(--muted)]">Add these only when the game needs tournament context, an end time, public links, or nonstandard controls.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2"><span className="text-sm font-bold">Tournament</span><select className={controlClass} disabled={isSaving} name="tournament_id"><option value="">No tournament</option>{tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}</select></label>
            <label className="grid gap-2"><span className="text-sm font-bold">End date and time</span><input className={controlClass} disabled={isSaving} name="end_time" type="datetime-local" /></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Sport</span><select className={controlClass} defaultValue="baseball" disabled={isSaving} name="sport_type" required>{sportTypes.map((sportType) => <option key={sportType} value={sportType}>{sportType.charAt(0).toUpperCase() + sportType.slice(1)}</option>)}</select></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Starting status</span><select className={controlClass} defaultValue="scheduled" disabled={isSaving} name="status" required><option value="scheduled">On time</option><option value="active">In progress</option><option value="final">Final</option></select></label>
          </div>
          <label className="flex min-h-12 items-start gap-3 rounded-lg border border-[var(--line)] bg-white p-4"><input className="mt-1 h-5 w-5" disabled={isSaving} name="is_demo" type="checkbox" /><span><span className="block text-sm font-black">Enable demo controls</span><span className="mt-1 block text-sm leading-6 text-[var(--muted)]">Use only for demonstrations, not real games.</span></span></label>
          <div><h2 className="text-base font-black">Public links</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Optional links to services already used for this game.</p></div>
          {["primary", "secondary"].map((position) => <div className="grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4 sm:grid-cols-[180px_1fr]" key={position}><label className="grid gap-2"><span className="text-sm font-bold">{position === "primary" ? "First" : "Second"} link</span><select className={controlClass} disabled={isSaving} name={`${position}_link_label`}><option value="">Select service</option>{linkLabels.map((label) => <option key={label} value={label}>{label}</option>)}</select></label><label className="grid gap-2"><span className="text-sm font-bold">URL</span><input className={controlClass} disabled={isSaving} name={`${position}_link_url`} placeholder="https://" type="url" /></label></div>)}
          <label className="grid gap-2"><span className="text-sm font-bold">Internal notes</span><textarea className={`${controlClass} min-h-28 py-3`} disabled={isSaving} name="notes" placeholder="Parking changes, bracket links, or venue notes." /></label>
        </div>
      </details>

      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex flex-col gap-2 border-t border-[var(--line)] bg-[var(--panel)]/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:px-0 lg:static lg:shadow-none">
        <button type="reset" disabled={isSaving} onClick={() => setSelectedVenueId(initialVenueId)} className="min-h-12 rounded-lg px-5 py-3 text-sm font-bold text-[var(--accent-strong)]">Clear form</button>
        <button type="submit" disabled={!canSubmit} className="min-h-12 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Creating..." : "Create game"}</button>
      </div>
    </form>
  );
}
