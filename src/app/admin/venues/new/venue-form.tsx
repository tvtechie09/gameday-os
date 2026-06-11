"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createVenueAction } from "./actions";

type Message = {
  kind: "success" | "error";
  text: string;
};

export function VenueForm() {
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

    const formData = new FormData(event.currentTarget);
    const result = await createVenueAction(formData).catch((error: unknown) => {
      console.error("Failed to create venue", error);
      return {
        error: error instanceof Error ? error.message : "Unable to create venue.",
      };
    });

    if (result.error) {
      console.error("Failed to create venue", result.error);
      setMessage({ kind: "error", text: result.error });
      setIsSaving(false);
      return;
    }

    setMessage({ kind: "success", text: "Venue created. Opening venue list..." });
    formRef.current?.reset();
    router.push("/admin/venues");
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

      <label className="grid gap-2">
        <span className="text-sm font-bold">Venue name</span>
        <input
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          name="name"
          placeholder="Enter venue name"
          required
          disabled={isSaving}
          type="text"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold">Description</span>
        <textarea
          className="min-h-28 rounded-lg border border-[var(--line)] bg-white p-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          name="description"
          placeholder="Describe the venue for internal operations"
          required
          disabled={isSaving}
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold">Address</span>
        <input
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          name="address"
          placeholder="Street address"
          required
          disabled={isSaving}
          type="text"
        />
      </label>

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
          disabled={isSaving}
          className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Create venue"}
        </button>
      </div>
    </form>
  );
}
