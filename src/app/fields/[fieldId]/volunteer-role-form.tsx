"use client";

import { useState, type FormEvent } from "react";
import type { VolunteerRoleType } from "@/lib/types";

type VolunteerOption = {
  label: string;
  type: VolunteerRoleType;
};

const options: VolunteerOption[] = [
  { label: "I'm keeping score", type: "scorekeeper" },
  { label: "I'm streaming", type: "stream_operator" },
  { label: "I'm handling audio", type: "audio_operator" },
  { label: "I'm announcing", type: "announcer" },
  { label: "I'm running the scoreboard", type: "scoreboard_operator" },
];

export function VolunteerRoleForm({
  venueId,
  fieldId,
  sessionId,
}: {
  venueId: string;
  fieldId: string;
  sessionId?: string | null;
}) {
  const [selected, setSelected] = useState<VolunteerOption | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/volunteer-roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueId,
        fieldId,
        sessionId,
        roleType: selected.type,
        displayName: String(formData.get("display_name") ?? ""),
        contactName: String(formData.get("contact_name") ?? ""),
        contactEmail: String(formData.get("contact_email") ?? ""),
        contactPhone: String(formData.get("contact_phone") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      }),
    }).catch(() => null);

    if (!response?.ok) {
      setMessage({ kind: "error", text: "Unable to submit volunteer request. Please try again." });
      setIsSaving(false);
      return;
    }

    setMessage({ kind: "success", text: "Volunteer request submitted. An operator can approve it from the admin dashboard." });
    event.currentTarget.reset();
    setIsSaving(false);
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5">
      <h2 className="text-lg font-black">Help Run This Game</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            className={selected?.type === option.type ? "min-h-12 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-black text-white" : "min-h-12 rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm font-black"}
            key={option.type}
            onClick={() => {
              setSelected(option);
              setMessage(null);
            }}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {selected ? (
        <form className="mt-5 grid gap-4 rounded-lg bg-[var(--background)] p-4" onSubmit={handleSubmit}>
          <h3 className="text-base font-black">{selected.label}</h3>
          {message ? (
            <p className={message.kind === "success" ? "rounded-lg bg-green-50 p-3 text-sm font-bold text-green-800" : "rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800"}>
              {message.text}
            </p>
          ) : null}
          <label className="grid gap-2">
            <span className="text-sm font-bold">Display Name</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="display_name" required />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Contact Name</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="contact_name" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold">Contact Email</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="contact_email" type="email" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold">Contact Phone</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="contact_phone" type="tel" />
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Notes</span>
            <textarea className="min-h-24 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" disabled={isSaving} name="notes" />
          </label>
          <button className="min-h-12 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white disabled:opacity-60" disabled={isSaving} type="submit">
            {isSaving ? "Submitting..." : "Submit volunteer request"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
