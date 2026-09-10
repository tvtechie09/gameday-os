"use client";

import { useActionState } from "react";
import {
  venueNotificationCategoryDetails,
  type VenueNotificationPreference,
} from "@/lib/notification-preferences-core";
import { saveNotificationPreferencesAction, type NotificationPreferenceActionResult } from "./actions";
import { offlineMutationMessage } from "@/lib/client-network";

const initialState: NotificationPreferenceActionResult = {};

export function NotificationPreferencesForm({ preferences, canSave }: { preferences: VenueNotificationPreference[]; canSave: boolean }) {
  const [state, action, pending] = useActionState(
    async (_state: NotificationPreferenceActionResult, formData: FormData): Promise<NotificationPreferenceActionResult> => {
      const offlineMessage = offlineMutationMessage("notification preference");
      return offlineMessage ? { error: offlineMessage } : saveNotificationPreferencesAction(formData);
    },
    initialState,
  );

  return (
    <form action={action} className="mt-4">
      <div className="divide-y divide-[var(--line)] rounded-lg border border-[var(--line)]">
        {preferences.map((preference) => {
          const details = venueNotificationCategoryDetails[preference.category];
          return (
            <label className="flex min-h-20 items-center justify-between gap-4 p-4" key={preference.category}>
              <span>
                <span className="block font-black">{details.label}</span>
                <span className="mt-1 block text-sm leading-5 text-[var(--muted)]">{details.description}</span>
              </span>
              <span className="shrink-0">
                <input
                  className="h-5 w-5 accent-[var(--accent)]"
                  defaultChecked={preference.enabled}
                  disabled={!canSave || pending}
                  name={preference.category}
                  type="checkbox"
                />
                <span className="sr-only">In-app notifications</span>
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Delivery channel: in app. SMS and push are not enabled. Urgent safety alerts always remain visible.
      </p>
      {!canSave ? <p className="mt-2 text-sm font-bold text-amber-900">Sign in with a hosted venue account to save changes. Current defaults are shown.</p> : null}
      {state.error ? <p className="mt-3 text-sm font-bold text-red-700" role="alert">{state.error}</p> : null}
      {state.ok ? <p className="mt-3 text-sm font-bold text-emerald-700" role="status">Preferences saved.</p> : null}
      <button className="mt-4 min-h-11 rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={!canSave || pending} type="submit">
        {pending ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
