"use client";

import { useState } from "react";
import type { FollowPreferenceLevel } from "@/lib/types";

type PreferenceFormProps = {
  initialEmailEnabled: boolean;
  initialNotificationLevel: FollowPreferenceLevel;
  token: string;
};

export function PreferenceForm({ initialEmailEnabled, initialNotificationLevel, token }: PreferenceFormProps) {
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled);
  const [notificationLevel, setNotificationLevel] = useState(initialNotificationLevel);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(nextEmailEnabled = emailEnabled) {
    setState("saving");
    const response = await fetch(`/api/follows/${token}`, {
      body: JSON.stringify({ emailEnabled: nextEmailEnabled, notificationLevel }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    }).catch(() => null);
    setState(response?.ok ? "saved" : "error");
  }

  return (
    <div className="mt-6 grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Email preference</legend>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--background)] px-4 text-sm font-bold">
          <input checked={notificationLevel === "all_updates"} disabled={!emailEnabled} onChange={() => setNotificationLevel("all_updates")} type="radio" />
          All game-day updates
        </label>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--background)] px-4 text-sm font-bold">
          <input checked={notificationLevel === "critical_only"} disabled={!emailEnabled} onChange={() => setNotificationLevel("critical_only")} type="radio" />
          Safety alerts and closures only
        </label>
      </fieldset>

      <button className="min-h-12 rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white disabled:opacity-60" disabled={!emailEnabled || state === "saving"} onClick={() => void save()} type="button">
        {state === "saving" ? "Saving…" : "Save preferences"}
      </button>
      {emailEnabled ? (
        <button className="min-h-12 rounded-lg border border-red-200 bg-white px-4 text-sm font-black text-red-700" onClick={() => { setEmailEnabled(false); void save(false); }} type="button">
          Stop email updates
        </button>
      ) : (
        <button className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-black" onClick={() => { setEmailEnabled(true); void save(true); }} type="button">
          Resume email updates
        </button>
      )}
      {state === "saved" ? <p className="rounded-lg bg-green-50 p-3 text-sm font-bold text-green-800">Your preferences are updated.</p> : null}
      {state === "error" ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800">We could not update your preferences. Please try again.</p> : null}
    </div>
  );
}
