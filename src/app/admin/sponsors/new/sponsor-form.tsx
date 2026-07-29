"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SponsorCategorySelect } from "@/components/admin/sponsor-category-select";
import { createSponsorAction } from "./actions";

type Message = {
  kind: "success" | "error";
  text: string;
};

export function SponsorForm() {
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

    const result = await createSponsorAction(new FormData(event.currentTarget)).catch((error: unknown) => {
      console.error("Failed to create sponsor", error);
      return {
        error: error instanceof Error ? error.message : "Unable to create sponsor.",
      };
    });

    if (result.error) {
      console.error("Failed to create sponsor", result.error);
      setMessage({ kind: "error", text: result.error });
      setIsSaving(false);
      return;
    }

    setMessage({ kind: "success", text: "Sponsor created. Opening sponsor list..." });
    formRef.current?.reset();
    router.push("/admin/sponsors");
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
        <span className="text-sm font-bold">Sponsor name</span>
        <input
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          disabled={isSaving}
          name="name"
          placeholder="Local business or organization"
          required
          type="text"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Logo URL</span>
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            disabled={isSaving}
            name="logo_url"
            placeholder="https://"
            type="url"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Website URL</span>
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            disabled={isSaving}
            name="website_url"
            placeholder="https://"
            type="url"
          />
        </label>
      </div>

      <SponsorCategorySelect disabled={isSaving} />

      <label className="grid gap-2">
        <span className="text-sm font-bold">Description</span>
        <textarea
          className="min-h-28 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          disabled={isSaving}
          name="description"
          placeholder="Short sponsor note for admins."
        />
      </label>

      <div className="flex justify-end border-t border-[var(--line)] pt-5">
        <button
          className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : "Create sponsor"}
        </button>
      </div>
    </form>
  );
}
