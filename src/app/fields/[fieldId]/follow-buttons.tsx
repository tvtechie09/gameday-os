"use client";

import { useState } from "react";
import type { FollowType } from "@/lib/types";

type FollowButtonsProps = {
  fieldId: string;
  sessionId?: string | null;
};

type FollowMessage = {
  kind: "success" | "error";
  text: string;
};

export function FollowButtons({ fieldId, sessionId }: FollowButtonsProps) {
  const [isSaving, setIsSaving] = useState<FollowType | null>(null);
  const [message, setMessage] = useState<FollowMessage | null>(null);

  async function follow(followType: FollowType) {
    if (isSaving) return;

    setIsSaving(followType);
    setMessage(null);

    const response = await fetch("/api/follows", {
      body: JSON.stringify({
        fieldId,
        followType,
        sessionId: followType === "session" ? sessionId : null,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch((error: unknown) => {
      console.error("Failed to follow", error);
      return null;
    });

    setIsSaving(null);

    if (!response?.ok) {
      setMessage({ kind: "error", text: "Unable to follow right now." });
      return;
    }

    setMessage({
      kind: "success",
      text: followType === "session" ? "You're following this game." : "You're following this field.",
    });
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5">
      <h2 className="text-lg font-black">Follow Updates</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Follow this field or the current game without creating an account.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          className="min-h-12 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(isSaving)}
          onClick={() => void follow("field")}
          type="button"
        >
          {isSaving === "field" ? "Following..." : "Follow This Field"}
        </button>
        <button
          className="min-h-12 rounded-lg border border-[var(--line)] bg-[var(--black-soft)] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(isSaving) || !sessionId}
          onClick={() => void follow("session")}
          type="button"
        >
          {isSaving === "session" ? "Following..." : "Follow This Game"}
        </button>
      </div>
      {message ? (
        <p className={message.kind === "success" ? "mt-4 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-800" : "mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800"}>
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
