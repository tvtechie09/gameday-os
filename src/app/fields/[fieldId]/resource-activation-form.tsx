"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ResourceActivationType } from "@/lib/types";

type ContributionOption = {
  defaultName: string;
  label: string;
  type: ResourceActivationType;
};

const options: ContributionOption[] = [
  { defaultName: "Livestream", label: "Share a Livestream Link", type: "livestream_link" },
  { defaultName: "Photos", label: "Share Photos Link", type: "other" },
  { defaultName: "Team Updates", label: "Share Team Updates Link", type: "other" },
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
  const router = useRouter();
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
        contactName: "",
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
    router.refresh();
    setIsSaving(false);
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Community</p>
      <h2 className="mt-1 text-lg font-black">Community Links</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Share useful links for families watching this game. Links appear immediately for v1.
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
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={selected.defaultName} disabled={isSaving} name="display_name" required />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Resource Type</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled readOnly value={selected.label} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">URL</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="resource_url" placeholder="https://" required type="url" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Notes</span>
            <textarea className="min-h-24 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" disabled={isSaving} name="notes" />
          </label>
          <button className="min-h-12 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white disabled:opacity-60" disabled={isSaving} type="submit">
            {isSaving ? "Sharing..." : "Share Link"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
