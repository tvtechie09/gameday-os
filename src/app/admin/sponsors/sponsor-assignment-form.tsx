"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import type { Field, Session, Sponsor, SponsorAssignmentType, Venue } from "@/lib/types";
import { createSponsorAssignmentAction } from "./actions";

type Message = {
  kind: "success" | "error";
  text: string;
};

type AssignmentTarget = {
  id: string;
  label: string;
};

function getTargets(type: SponsorAssignmentType, venues: Venue[], fields: Field[], sessions: Session[]): AssignmentTarget[] {
  if (type === "venue") {
    return venues.map((venue) => ({ id: venue.id, label: venue.name }));
  }

  if (type === "field") {
    return fields.map((field) => ({ id: field.id, label: field.name }));
  }

  return sessions.map((session) => ({ id: session.id, label: session.title }));
}

export function SponsorAssignmentForm({
  fields,
  sessions,
  sponsors,
  venues,
}: {
  fields: Field[];
  sessions: Session[];
  sponsors: Sponsor[];
  venues: Venue[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [assignmentType, setAssignmentType] = useState<SponsorAssignmentType>("venue");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const targets = useMemo(() => getTargets(assignmentType, venues, fields, sessions), [assignmentType, fields, sessions, venues]);
  const canSubmit = sponsors.length > 0 && targets.length > 0 && !isSaving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const result = await createSponsorAssignmentAction(new FormData(event.currentTarget)).catch((error: unknown) => {
      console.error("Failed to create sponsor assignment", error);
      return {
        error: error instanceof Error ? error.message : "Unable to create sponsor assignment.",
      };
    });

    if (result.error) {
      console.error("Failed to create sponsor assignment", result.error);
      setMessage({ kind: "error", text: result.error });
      setIsSaving(false);
      return;
    }

    setMessage({ kind: "success", text: "Sponsor assignment created." });
    formRef.current?.reset();
    setAssignmentType("venue");
    setIsSaving(false);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-5 grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
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

      {sponsors.length === 0 ? (
        <div className="rounded-lg border border-[var(--line)] bg-white p-4 text-sm font-semibold text-[var(--muted)]">
          Create a sponsor before adding assignments.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Sponsor</span>
          <select
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            disabled={sponsors.length === 0 || isSaving}
            name="sponsor_id"
            required
          >
            <option value="">Select sponsor</option>
            {sponsors.map((sponsor) => (
              <option key={sponsor.id} value={sponsor.id}>
                {sponsor.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Assignment type</span>
          <select
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            disabled={isSaving}
            name="assignment_type"
            onChange={(event) => setAssignmentType(event.target.value as SponsorAssignmentType)}
            required
            value={assignmentType}
          >
            <option value="venue">Venue</option>
            <option value="field">Field</option>
            <option value="session">Session</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Target</span>
          <select
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            disabled={targets.length === 0 || isSaving}
            name="target_id"
            required
          >
            <option value="">{targets.length > 0 ? "Select target" : "No matching targets"}</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Placement label</span>
          <select
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            disabled={isSaving}
            name="placement_label"
            required
          >
            <option value="Presented By">Presented By</option>
            <option value="Field Sponsor">Field Sponsor</option>
            <option value="Game Sponsor">Game Sponsor</option>
            <option value="Featured Sponsor">Featured Sponsor</option>
          </select>
        </label>
      </div>

      <div className="flex justify-end border-t border-[var(--line)] pt-4">
        <button
          className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSubmit}
          type="submit"
        >
          {isSaving ? "Saving..." : "Create assignment"}
        </button>
      </div>
    </form>
  );
}
