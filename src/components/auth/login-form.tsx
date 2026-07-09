"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseAuthBrowserClient } from "@/lib/supabase/auth-browser";

// Email/password sign-in form. On success we do a full navigation so the server
// re-resolves the session (cookies are now set) and routes to the role home.
export function LoginForm({
  next,
  devLoginEnabled,
}: Readonly<{ next: string; devLoginEnabled: boolean }>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = getSupabaseAuthBrowserClient();
    if (!supabase) {
      setError("Authentication is not configured for this environment.");
      setSubmitting(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    // Full navigation so server components pick up the new session cookies.
    window.location.assign(next && next.startsWith("/") ? next : "/");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm font-bold text-[var(--foreground)]">
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)]"
          placeholder="you@example.com"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-bold text-[var(--foreground)]">
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)]"
          placeholder="••••••••"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-xs leading-5 text-[var(--muted)]">
        Use a real account. Demo role-switching is available in staging.
      </p>

      {devLoginEnabled ? (
        <Link
          href={next ? `/dev-login?next=${encodeURIComponent(next)}` : "/dev-login"}
          className="text-xs font-bold text-emerald-700 underline underline-offset-2"
        >
          Staging: use dev login instead
        </Link>
      ) : null}
    </form>
  );
}
