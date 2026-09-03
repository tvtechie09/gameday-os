"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { alertScopes, alertTypes, alertVisibilities, getAlertScopeLabel } from "@/lib/services/alerts";
import { alertTypeLabel } from "@/lib/ui/status-presentation";
import type { AlertPriority, AlertScope, AlertType, Field, Tournament, Venue } from "@/lib/types";
import { createAlertAction } from "../actions";
import { trackPilotEvent } from "@/components/pilot/pilot-telemetry";
import { durationBucket } from "@/lib/pilot-telemetry-core";

type Message = { kind: "success" | "error"; text: string };
type AlertFormInitialValues = { alertPriority?: AlertPriority; alertScope?: AlertScope; alertType?: AlertType; message?: string; title?: string };
const controlClass = "min-h-12 min-w-0 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]";

export function AlertForm({ fields, initialValues, tournaments, venues }: { fields: Field[]; initialValues?: AlertFormInitialValues; tournaments: Tournament[]; venues: Venue[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const initialVenueId = venues.length === 1 ? venues[0].id : "";
  const [selectedVenueId, setSelectedVenueId] = useState(initialVenueId);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const venueFields = useMemo(() => fields.filter((field) => field.venueId === selectedVenueId), [fields, selectedVenueId]);
  const initialPriority = initialValues?.alertPriority === "urgent" || initialValues?.alertPriority === "high" ? initialValues.alertPriority : "normal";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setMessage(null);
    const startedAt = Date.now();
    const result = await createAlertAction(new FormData(event.currentTarget)).catch(() => ({ error: "Couldn't publish this announcement. Check your connection and try again." }));
    if (result.error) {
      trackPilotEvent("pilot_announcement_failed", { actionType: "publish", durationBucket: durationBucket(Date.now() - startedAt), outcome: "failed" });
      setMessage({ kind: "error", text: result.error });
      setIsSaving(false);
      return;
    }
    trackPilotEvent("pilot_announcement_published", { actionType: "publish", durationBucket: durationBucket(Date.now() - startedAt), outcome: "completed" });
    setMessage({ kind: "success", text: "Announcement published. Opening announcements…" });
    formRef.current?.reset();
    router.push("/admin/alerts");
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-8 grid min-w-0 gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-6">
      {message ? <div className={message.kind === "success" ? "rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800" : "rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"} role={message.kind === "error" ? "alert" : "status"}>{message.text}</div> : null}
      <label className="grid gap-2"><span className="text-sm font-bold">Update title</span><input className={controlClass} defaultValue={initialValues?.title ?? ""} disabled={isSaving} name="title" placeholder="Lightning delay" required /></label>
      <label className="grid gap-2"><span className="text-sm font-bold">What should people know?</span><textarea className={`${controlClass} min-h-28 py-3`} defaultValue={initialValues?.message ?? ""} disabled={isSaving} name="message" placeholder="Games are paused until the all-clear." required /></label>
      <label className="grid gap-2"><span className="text-sm font-bold">Venue</span><select className={controlClass} disabled={isSaving || venues.length === 0} name="venue_id" onChange={(event) => setSelectedVenueId(event.target.value)} required value={selectedVenueId}><option value="">Select venue</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2"><span className="text-sm font-bold">Show from</span><input className={controlClass} disabled={isSaving} name="start_time" required type="datetime-local" /></label>
        <label className="grid gap-2"><span className="text-sm font-bold">Show until</span><input className={controlClass} disabled={isSaving} name="end_time" required type="datetime-local" /></label>
      </div>

      <details className="group rounded-lg border border-[var(--line)] bg-[var(--background)]">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-extrabold text-[var(--accent-strong)]">Advanced delivery options <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span></summary>
        <div className="grid gap-5 border-t border-[var(--line)] p-4">
          <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-950">Public updates appear only for families with a relevant event at this venue, field, or tournament during the publish window.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2"><span className="text-sm font-bold">Update type</span><select className={controlClass} defaultValue={initialValues?.alertType ?? "info"} disabled={isSaving} name="alert_type" required>{alertTypes.map((type) => <option key={type} value={type}>{alertTypeLabel(type)}</option>)}</select></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Who or what is affected?</span><select className={controlClass} defaultValue={initialValues?.alertScope ?? "venue"} disabled={isSaving} name="alert_scope" required>{alertScopes.map((scope) => <option key={scope} value={scope}>{getAlertScopeLabel(scope)}</option>)}</select></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Attention level</span><select className={controlClass} defaultValue={initialPriority} disabled={isSaving} name="alert_priority" required><option value="normal">Informational</option><option value="high">Important</option><option value="urgent">Urgent</option></select></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Audience</span><select className={controlClass} defaultValue="public" disabled={isSaving} name="alert_visibility" required>{alertVisibilities.map((visibility) => <option key={visibility} value={visibility}>{visibility === "public" ? "Family and public" : "Venue staff only"}</option>)}</select></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Tournament</span><select className={controlClass} disabled={isSaving} name="tournament_id"><option value="">All tournaments</option>{tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}</select></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Field</span><select className={controlClass} disabled={isSaving || !selectedVenueId} name="field_id"><option value="">All fields</option>{venueFields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label>
          </div>
          <label className="flex min-h-12 items-center gap-3 rounded-lg bg-white p-4 text-sm font-bold"><input className="h-5 w-5 accent-[var(--accent)]" defaultChecked disabled={isSaving} name="is_active" type="checkbox" />Publish now</label>
        </div>
      </details>

      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex justify-end border-t border-[var(--line)] bg-[var(--panel)]/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:mx-0 sm:px-0 lg:static lg:shadow-none">
        <button className="min-h-12 w-full rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto" disabled={isSaving || !selectedVenueId} type="submit">{isSaving ? "Publishing..." : "Publish update"}</button>
      </div>
    </form>
  );
}
