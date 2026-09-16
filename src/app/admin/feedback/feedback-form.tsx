"use client";

import { useState, useTransition } from "react";
import { submitFeedbackAction, type FeedbackResult } from "./actions";

const pilotScreens = ["Home", "Today", "Fields", "Schedule", "Work Orders", "Venue Status", "Announcements", "Other"];

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<FeedbackResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const outcome = await submitFeedbackAction(formData);
      setResult(outcome);
      if (outcome.ok) setMessage("");
    });
  };

  return (
    <form action={submit} className="grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
          Type
          <select name="feedback_type" className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold normal-case tracking-normal" defaultValue="confusing">
            <option value="confusing">Confusing</option>
            <option value="bug">Bug</option>
            <option value="suggestion">Suggestion</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
          Screen <span className="normal-case tracking-normal">(optional)</span>
          <select name="screen" className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold normal-case tracking-normal" defaultValue="">
            <option value="">Choose a screen</option>
            {pilotScreens.map((screen) => <option key={screen} value={screen}>{screen}</option>)}
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
        Your message
        <textarea name="message" value={message} onChange={(event) => setMessage(event.target.value)} rows={5} maxLength={2000} placeholder="What happened, and what did you expect?" className="rounded-lg border border-[var(--line)] p-3 text-sm font-semibold normal-case tracking-normal outline-none focus:border-[var(--accent)]" />
      </label>
      <div>
        <button type="submit" disabled={isPending || message.trim().length < 5} className="min-h-11 rounded-lg bg-[var(--accent)] px-5 text-sm font-black text-white disabled:opacity-50">
          {isPending ? "Sending..." : "Send Feedback"}
        </button>
      </div>
      {result?.ok ? <p className="rounded-lg bg-green-50 p-3 text-sm font-bold text-green-800">Thanks — your feedback went straight to the GameDay team.</p> : null}
      {result?.error ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800">{result.error}</p> : null}
      <p className="text-xs font-semibold leading-5 text-[var(--muted)]">Do not include passwords, access links, private notes, phone numbers, or email addresses.</p>
    </form>
  );
}
