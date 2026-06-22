"use client";

import { useState, type FormEvent } from "react";
import type { ResourceActivationType } from "@/lib/types";

type ContributionOption = {
  label: string;
  type: ResourceActivationType;
};

const options: ContributionOption[] = [
  { label: "Camera", type: "parent_camera" },
  { label: "Livestream", type: "livestream_link" },
  { label: "Audio", type: "bluetooth_speaker" },
  { label: "Scoreboard Operator", type: "scoreboard_operator" },
  { label: "Announcer", type: "announcer" },
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

    setMessage({ kind: "success", text: "Thanks. Your contribution is now live on the field page." });
    event.currentTarget.reset();
    setIsSaving(false);
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Community</p>
      <h2 className="mt-1 text-lg font-black">Community Contributions</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Use this if you are helping with a stream, camera, audio, or scoreboard.
      </p>
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
            <span className="text-sm font-bold">Resource Type</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled readOnly value={selected.label} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">URL optional</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="resource_url" placeholder="https://" type="url" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Notes</span>
            <textarea className="min-h-24 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" disabled={isSaving} name="notes" />
          </label>
          <button className="min-h-12 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white disabled:opacity-60" disabled={isSaving} type="submit">
            {isSaving ? "Sharing..." : "Share contribution"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
