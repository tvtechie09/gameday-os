"use client";

import { useState, type FormEvent } from "react";
import type { ResourceActivationType } from "@/lib/types";

type ContributionOption = {
  label: string;
  type: ResourceActivationType;
  needsUrl?: boolean;
};

const options: ContributionOption[] = [
  { label: "Add Livestream Link", type: "livestream_link", needsUrl: true },
  { label: "I'm Running the Scoreboard", type: "scoreboard_operator" },
  { label: "I'm Providing Audio", type: "bluetooth_speaker" },
  { label: "I'm Providing Camera", type: "parent_camera" },
];

export function ResourceActivationForm({
  venueId,
  fieldId,
  sessionId,
}: {
  venueId: string;
  fieldId: string;
  sessionId?: string | null;
}) {
  const [selected, setSelected] = useState<ContributionOption | null>(null);
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
    const response = await fetch("/api/resource-activations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueId,
        fieldId,
        sessionId,
        activationType: selected.type,
        displayName: String(formData.get("display_name") ?? ""),
        contactName: String(formData.get("contact_name") ?? ""),
        resourceUrl: String(formData.get("resource_url") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      }),
    }).catch(() => null);

    if (!response?.ok) {
      setMessage({ kind: "error", text: "Unable to submit request. Please try again." });
      setIsSaving(false);
      return;
    }

    setMessage({ kind: "success", text: "Request submitted. An operator can approve it from the admin dashboard." });
    event.currentTarget.reset();
    setIsSaving(false);
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5">
      <h2 className="text-lg font-black">Contribute to this field</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            className={selected?.type === option.type ? "min-h-11 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-black text-white" : "min-h-11 rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-black"}
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
          {selected.needsUrl ? (
            <label className="grid gap-2">
              <span className="text-sm font-bold">Resource URL</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="resource_url" placeholder="https://" type="url" />
            </label>
          ) : null}
          <label className="grid gap-2">
            <span className="text-sm font-bold">Notes</span>
            <textarea className="min-h-24 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" disabled={isSaving} name="notes" />
          </label>
          <button className="min-h-11 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white disabled:opacity-60" disabled={isSaving} type="submit">
            {isSaving ? "Submitting..." : "Submit request"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
