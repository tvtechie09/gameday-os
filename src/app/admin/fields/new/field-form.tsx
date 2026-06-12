"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Venue } from "@/lib/types";
import { createFieldAction } from "./actions";

type Message = {
  kind: "success" | "error";
  text: string;
};

export function FieldForm({ venues }: { venues: Venue[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const hasVenues = venues.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving || !hasVenues) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const result = await createFieldAction(new FormData(event.currentTarget)).catch((error: unknown) => {
      console.error("Failed to create field", error);
      return {
        error: error instanceof Error ? error.message : "Unable to create field.",
      };
    });

    if (result.error) {
      console.error("Failed to create field", result.error);
      setMessage({ kind: "error", text: result.error });
      setIsSaving(false);
      return;
    }

    setMessage({ kind: "success", text: "Field created. Opening field list..." });
    formRef.current?.reset();
    router.push("/admin/fields");
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

      {!hasVenues ? (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4 text-sm font-semibold text-[var(--muted)]">
          Create a venue before adding fields.
        </div>
      ) : null}

      <label className="grid gap-2">
        <span className="text-sm font-bold">Venue</span>
        <select
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          disabled={!hasVenues || isSaving}
          name="venue_id"
          required
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
        <span className="text-sm font-bold">Field name</span>
        <input
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          disabled={!hasVenues || isSaving}
          name="name"
          placeholder="Field 1"
          required
          type="text"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold">Sport type</span>
        <input
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          disabled={!hasVenues || isSaving}
          name="sport_type"
          placeholder="Baseball, softball, soccer, multi-use"
          required
          type="text"
        />
      </label>

      <section className="grid gap-5 border-t border-[var(--line)] pt-5">
        <div>
          <h2 className="text-lg font-black">Map position</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Optional marker placement for the venue map. Use percentages from the left and top edges.
          </p>
        </div>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Map Label</span>
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            disabled={!hasVenues || isSaving}
            name="map_label"
            placeholder="Field 1, Diamond A, Court 3"
            type="text"
          />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Map X Position</span>
            <input
              className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              disabled={!hasVenues || isSaving}
              max="100"
              min="0"
              name="map_x"
              placeholder="0-100"
              step="0.1"
              type="number"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Map Y Position</span>
            <input
              className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              disabled={!hasVenues || isSaving}
              max="100"
              min="0"
              name="map_y"
              placeholder="0-100"
              step="0.1"
              type="number"
            />
          </label>
        </div>
      </section>

      <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
        <button
          type="reset"
          disabled={isSaving}
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold text-[var(--foreground)]"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={!hasVenues || isSaving}
          className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Create field"}
        </button>
      </div>
    </form>
  );
}
