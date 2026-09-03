"use client";

import { useState } from "react";
import type { FollowPreferenceLevel, FollowType } from "@/lib/types";

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
  const [email, setEmail] = useState("");
  const [notificationLevel, setNotificationLevel] = useState<FollowPreferenceLevel>("all_updates");
  const [manageUrl, setManageUrl] = useState("");

  async function follow(followType: FollowType) {
    if (isSaving) return;

    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setMessage({ kind: "error", text: "Enter a valid email to receive updates." });
      return;
    }

    setIsSaving(followType);
    setMessage(null);

    const response = await fetch("/api/follows", {
      body: JSON.stringify({
        fieldId,
        followType,
        sessionId: followType === "session" ? sessionId : null,
        email: email.trim() || null,
        notificationLevel,
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

    const result = await response.json().catch(() => ({})) as { manageUrl?: string };
    setManageUrl(result.manageUrl ?? "");
    setMessage({
      kind: "success",
      text: (followType === "session" ? "You're following this game." : "You're following this field.") + (email.trim() ? " Your email preferences are saved." : ""),
    });
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5">
      <h2 className="text-lg font-black">Get game-day updates</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Choose what matters to you. No account required.
      </p>
      <label className="mt-4 block">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Email</span>
        <input
          className="mt-1 min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)] focus:bg-white"
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          type="email"
          required
          value={email}
        />
      </label>
      <fieldset className="mt-4 grid gap-2">
        <legend className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Send me</legend>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 text-sm font-bold">
          <input checked={notificationLevel === "all_updates"} name="notification-level" onChange={() => setNotificationLevel("all_updates")} type="radio" />
          All game-day updates
        </label>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 text-sm font-bold">
          <input checked={notificationLevel === "critical_only"} name="notification-level" onChange={() => setNotificationLevel("critical_only")} type="radio" />
          Safety alerts and closures only
        </label>
      </fieldset>
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
        <div className={message.kind === "success" ? "mt-4 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-800" : "mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800"}>
          <p>{message.text}</p>
          {manageUrl && email.trim() ? <a className="mt-2 inline-flex min-h-11 items-center underline" href={manageUrl}>Manage or stop emails</a> : null}
        </div>
      ) : null}
    </section>
  );
}
