"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseAuthBrowserClient } from "@/lib/supabase/auth-browser";

// Password form for invited/recovering users who already hold a session from
// the emailed link. On success we do a full navigation so the server
// re-resolves the session and routes to the role home.
export function SetPasswordForm({ hasSession }: Readonly<{ hasSession: boolean }>) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!hasSession) {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white transition hover:bg-black"
      >
        Go to sign in
      </Link>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseAuthBrowserClient();
    if (!supabase) {
      setError("Authentication is not configured for this environment.");
      setSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    window.location.assign("/");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm font-bold text-[var(--foreground)]">
        New password
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)]"
          placeholder="At least 8 characters"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-bold text-[var(--foreground)]">
        Confirm password
        <input
          type="password"
          name="confirm_password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)]"
          placeholder="Repeat your password"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save password and continue"}
      </button>
    </form>
  );
}
