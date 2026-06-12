"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createTournamentAction } from "../actions";

type Message = {
  kind: "success" | "error";
  text: string;
};

export function TournamentForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const result = await createTournamentAction(new FormData(event.currentTarget)).catch((error: unknown) => {
      console.error("Failed to create tournament", error);
      return {
        error: error instanceof Error ? error.message : "Unable to create tournament.",
      };
    });

    if (result.error) {
      console.error("Failed to create tournament", result.error);
      setMessage({ kind: "error", text: result.error });
      setIsSaving(false);
      return;
    }

    setMessage({ kind: "success", text: "Tournament created. Opening tournament list..." });
    formRef.current?.reset();
    router.push("/admin/tournaments");
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
      {message ? (
        <div className={message.kind === "success" ? "rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800" : "rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"}>
          {message.text}
        </div>
      ) : null}
      <label className="grid gap-2">
        <span className="text-sm font-bold">Tournament name</span>
        <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="name" required />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Start date</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="start_date" required type="date" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">End date</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="end_date" required type="date" />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Logo URL</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="logo_url" placeholder="https://" type="url" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Website URL</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="website_url" placeholder="https://" type="url" />
        </label>
      </div>
      <label className="grid gap-2">
        <span className="text-sm font-bold">Description</span>
        <textarea className="min-h-28 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" disabled={isSaving} name="description" />
      </label>
      <div className="flex justify-end border-t border-[var(--line)] pt-5">
        <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Create tournament"}
        </button>
      </div>
    </form>
  );
}
