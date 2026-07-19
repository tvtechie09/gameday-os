"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseAuthBrowserClient } from "@/lib/supabase/auth-browser";

// Password form for invited/recovering users arriving from an emailed link.
// Session detection happens client-side because GoTrue can deliver the link
// result either as a ?code= (exchanged by /auth/callback) or as #access_token
// hash tokens, which never reach the server. The browser client's
// detectSessionInUrl handles the hash form on creation; we just wait for it.
export function SetPasswordForm({ hasSession }: Readonly<{ hasSession: boolean }>) {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(!hasSession);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseAuthBrowserClient();
    let cancelled = false;

    if (!supabase) {
      const bail = window.setTimeout(() => {
        if (!cancelled) setChecking(false);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(bail);
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session?.user) {
        setSessionEmail(session.user.email ?? "");
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session?.user) {
        setSessionEmail(data.session.user.email ?? "");
      }
    });

    // Give detectSessionInUrl a moment to process hash tokens before we
    // declare the link dead.
    const timer = window.setTimeout(() => {
      if (!cancelled) setChecking(false);
    }, 2500);

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const ready = hasSession || Boolean(sessionEmail);

  if (!ready && checking) {
    return <p className="text-sm font-bold text-[var(--muted)]">Checking your invite link…</p>;
  }

  if (!ready) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          This link has expired or was already used. Ask your admin to send a new invite, or sign in if you already have a password.
        </p>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white transition hover:bg-black"
        >
          Go to sign in
        </Link>
      </div>
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
      {sessionEmail ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
          Setting a password for {sessionEmail}.
        </p>
      ) : null}
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
