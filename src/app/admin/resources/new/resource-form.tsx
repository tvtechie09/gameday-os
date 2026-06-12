"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { resourceStatuses, resourceTypes } from "@/lib/services/resources";
import type { Field, Venue } from "@/lib/types";
import { createResourceAction } from "../actions";

type Message = {
  kind: "success" | "error";
  text: string;
};

export function ResourceForm({ fields, venues }: { fields: Field[]; venues: Venue[] }) {
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

    const result = await createResourceAction(new FormData(event.currentTarget)).catch((error: unknown) => {
      console.error("Failed to create resource", error);
      return { error: error instanceof Error ? error.message : "Unable to create resource." };
    });

    if (result.error) {
      console.error("Failed to create resource", result.error);
      setMessage({ kind: "error", text: result.error });
      setIsSaving(false);
      return;
    }

    setMessage({ kind: "success", text: "Resource created. Opening resource list..." });
    formRef.current?.reset();
    router.push("/admin/resources");
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
      {message ? (
        <div className={message.kind === "success" ? "rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800" : "rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"}>
          {message.text}
        </div>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Venue</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="venue_id" onChange={(event) => setSelectedVenueId(event.target.value)} required value={selectedVenueId}>
            <option value="">Select venue</option>
            {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Field</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving || !selectedVenueId} name="field_id">
            <option value="">Venue-wide resource</option>
            {venueFields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
          </select>
        </label>
      </div>
      <label className="grid gap-2">
        <span className="text-sm font-bold">Resource name</span>
        <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="resource_name" placeholder="Center field camera" required />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Resource type</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="resource_type" required>
            {resourceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Status</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue="active" disabled={isSaving} name="status" required>
            {resourceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Manufacturer</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="manufacturer" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Model</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="model" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Serial number</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="serial_number" />
        </label>
      </div>
      <label className="grid gap-2">
        <span className="text-sm font-bold">Notes</span>
        <textarea className="min-h-28 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" disabled={isSaving} name="notes" />
      </label>
      <div className="flex justify-end border-t border-[var(--line)] pt-5">
        <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Create resource"}
        </button>
      </div>
    </form>
  );
}
