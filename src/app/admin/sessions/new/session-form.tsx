"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Field, Venue } from "@/lib/types";
import { createSessionAction } from "./actions";

type Message = {
  kind: "success" | "error";
  text: string;
};

export function SessionForm({ fields, venues }: { fields: Field[]; venues: Venue[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const availableFields = useMemo(
    () => fields.filter((field) => field.venueId === selectedVenueId),
    [fields, selectedVenueId],
  );
  const canSubmit = venues.length > 0 && availableFields.length > 0 && !isSaving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const result = await createSessionAction(new FormData(event.currentTarget)).catch((error: unknown) => {
      console.error("Failed to create session", error);
      return {
        error: error instanceof Error ? error.message : "Unable to create session.",
      };
    });

    if (result.error) {
      console.error("Failed to create session", result.error);
      setMessage({ kind: "error", text: result.error });
      setIsSaving(false);
      return;
    }

    setMessage({ kind: "success", text: "Session created. Opening session list..." });
    formRef.current?.reset();
    router.push("/admin/sessions");
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
      {message ? (
        <div
          className={
            message.kind === "success"
              ? "rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800"
              : "rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
          }
        >
          {message.text}
        </div>
      ) : null}

      {venues.length === 0 ? (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4 text-sm font-semibold text-[var(--muted)]">
          Create a venue before adding sessions.
        </div>
      ) : null}

      <label className="grid gap-2">
        <span className="text-sm font-bold">Venue</span>
        <select
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          disabled={venues.length === 0 || isSaving}
          onChange={(event) => setSelectedVenueId(event.target.value)}
          required
          value={selectedVenueId}
        >
          <option value="">Select a venue</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold">Field</span>
        <select
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          disabled={!selectedVenueId || availableFields.length === 0 || isSaving}
          name="field_id"
          required
        >
          <option value="">{selectedVenueId ? "Select a field" : "Select a venue first"}</option>
          {availableFields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold">Session title</span>
        <input
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          disabled={isSaving}
          name="title"
          placeholder="Pool Play Game"
          required
          type="text"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Home team</span>
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            disabled={isSaving}
            name="home_team"
            placeholder="Home team"
            required
            type="text"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Away team</span>
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            disabled={isSaving}
            name="away_team"
            placeholder="Away team"
            required
            type="text"
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Start date/time</span>
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            disabled={isSaving}
            name="start_time"
            required
            type="datetime-local"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">End date/time</span>
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            disabled={isSaving}
            name="end_time"
            type="datetime-local"
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Status</span>
          <select
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            defaultValue="scheduled"
            disabled={isSaving}
            name="status"
            required
          >
            <option value="scheduled">scheduled</option>
            <option value="active">active</option>
            <option value="final">final</option>
          </select>
        </label>
      </div>

      <section className="grid gap-5 border-t border-[var(--line)] pt-5">
        <div>
          <h2 className="text-lg font-black">Session links</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Add one or two parent-facing links to the platforms this game already uses.
          </p>
        </div>
        <div className="grid gap-5">
          <div className="grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4 sm:grid-cols-[180px_1fr]">
            <label className="grid gap-2">
              <span className="text-sm font-bold">Primary label</span>
              <select
                className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                disabled={isSaving}
                name="primary_link_label"
              >
                <option value="">Select label</option>
                <option value="GameChanger">GameChanger</option>
                <option value="SidelineHD">SidelineHD</option>
                <option value="YouTube">YouTube</option>
                <option value="SportsEngine">SportsEngine</option>
                <option value="TeamSnap">TeamSnap</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold">Primary URL</span>
              <input
                className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                disabled={isSaving}
                name="primary_link_url"
                placeholder="https://"
                type="url"
              />
            </label>
          </div>

          <div className="grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4 sm:grid-cols-[180px_1fr]">
            <label className="grid gap-2">
              <span className="text-sm font-bold">Secondary label</span>
              <select
                className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                disabled={isSaving}
                name="secondary_link_label"
              >
                <option value="">Select label</option>
                <option value="GameChanger">GameChanger</option>
                <option value="SidelineHD">SidelineHD</option>
                <option value="YouTube">YouTube</option>
                <option value="SportsEngine">SportsEngine</option>
                <option value="TeamSnap">TeamSnap</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold">Secondary URL</span>
              <input
                className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                disabled={isSaving}
                name="secondary_link_url"
                placeholder="https://"
                type="url"
              />
            </label>
          </div>
        </div>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Notes</span>
          <textarea
            className="min-h-28 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            disabled={isSaving}
            name="notes"
            placeholder="Parking changes, weather updates, bracket links, or venue notes."
          />
        </label>
      </section>

      <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
        <button
          type="reset"
          disabled={isSaving}
          onClick={() => setSelectedVenueId("")}
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold text-[var(--foreground)]"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Create session"}
        </button>
      </div>
    </form>
  );
}
