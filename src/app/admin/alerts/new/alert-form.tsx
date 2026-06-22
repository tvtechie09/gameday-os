"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { alertPriorities, alertScopes, alertTypes, alertVisibilities, getAlertPriorityLabel, getAlertScopeLabel } from "@/lib/services/alerts";
import type { AlertPriority, AlertScope, AlertType, Field, Tournament, Venue } from "@/lib/types";
import { createAlertAction } from "../actions";

type Message = {
  kind: "success" | "error";
  text: string;
};

type AlertFormInitialValues = {
  alertPriority?: AlertPriority;
  alertScope?: AlertScope;
  alertType?: AlertType;
  message?: string;
  title?: string;
};

export function AlertForm({
  fields,
  initialValues,
  tournaments,
  venues,
}: {
  fields: Field[];
  initialValues?: AlertFormInitialValues;
  tournaments: Tournament[];
  venues: Venue[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const venueFields = useMemo(() => fields.filter((field) => field.venueId === selectedVenueId), [fields, selectedVenueId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const result = await createAlertAction(new FormData(event.currentTarget)).catch((error: unknown) => {
      console.error("Failed to create alert", error);
      return { error: error instanceof Error ? error.message : "Unable to create alert." };
    });

    if (result.error) {
      console.error("Failed to create alert", result.error);
      setMessage({ kind: "error", text: result.error });
      setIsSaving(false);
      return;
    }

    setMessage({ kind: "success", text: "Alert created. Opening alerts list..." });
    formRef.current?.reset();
    router.push("/admin/alerts");
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
      {message ? (
        <div className={message.kind === "success" ? "rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800" : "rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"}>
          {message.text}
        </div>
      ) : null}
      <label className="grid gap-2">
        <span className="text-sm font-bold">Title</span>
        <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={initialValues?.title ?? ""} disabled={isSaving} name="title" placeholder="Lightning Delay" required />
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-bold">Message</span>
        <textarea className="min-h-28 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" defaultValue={initialValues?.message ?? ""} disabled={isSaving} name="message" placeholder="Games are paused until the all-clear." required />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Alert type</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={initialValues?.alertType ?? "info"} disabled={isSaving} name="alert_type" required>
            {alertTypes.map((type) => (
              <option key={type} value={type}>{type.replace("_", " ")}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Scope</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={initialValues?.alertScope ?? "venue"} disabled={isSaving} name="alert_scope" required>
            {alertScopes.map((scope) => (
              <option key={scope} value={scope}>{getAlertScopeLabel(scope)}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Priority</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={initialValues?.alertPriority ?? "normal"} disabled={isSaving} name="alert_priority" required>
            {alertPriorities.map((priority) => (
              <option key={priority} value={priority}>{getAlertPriorityLabel(priority)}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Visibility</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue="public" disabled={isSaving} name="alert_visibility" required>
            {alertVisibilities.map((visibility) => (
              <option key={visibility} value={visibility}>{visibility.replace("_", " ")}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Venue</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="venue_id" onChange={(event) => setSelectedVenueId(event.target.value)} required value={selectedVenueId}>
            <option value="">Select venue</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>{venue.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Tournament</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="tournament_id">
            <option value="">All tournaments</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Field</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving || !selectedVenueId} name="field_id">
            <option value="">All fields</option>
            {venueFields.map((field) => (
              <option key={field.id} value={field.id}>{field.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Start time</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="start_time" required type="datetime-local" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">End time</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="end_time" required type="datetime-local" />
        </label>
      </div>
      <label className="flex items-center gap-3 rounded-lg bg-white p-4 text-sm font-bold">
        <input className="h-5 w-5 accent-[var(--accent)]" defaultChecked disabled={isSaving} name="is_active" type="checkbox" />
        Active
      </label>
      <div className="flex justify-end border-t border-[var(--line)] pt-5">
        <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Create alert"}
        </button>
      </div>
    </form>
  );
}
