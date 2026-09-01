"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseAuthBrowserClient } from "@/lib/supabase/auth-browser";
import { isPlausibleTotpCode, needsMfaChallenge } from "@/lib/access/mfa-core";
import { AlertBanner, buttonStyles } from "@/components/ui/gameday-ui";

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
  // Set only after a password sign-in that Supabase says needs a second factor.
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  function goToDestination() {
    // Full navigation so server components pick up the new session cookies.
    window.location.assign(next && next.startsWith("/") ? next : "/");
  }

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

    // Only users who actually enrolled a factor are challenged; Supabase's AAL
    // model decides that per-user, so there's no separate "is this an admin"
    // gate to keep in sync.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (needsMfaChallenge(aal?.currentLevel ?? null, aal?.nextLevel ?? null)) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp?.find((factor) => factor.status === "verified");
      if (verified) {
        setMfaFactorId(verified.id);
        setSubmitting(false);
        return;
      }
    }

    goToDestination();
  }

  async function onSubmitMfa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!isPlausibleTotpCode(mfaCode)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setSubmitting(true);

    const supabase = getSupabaseAuthBrowserClient();
    if (!supabase) {
      setError("Authentication is not configured for this environment.");
      setSubmitting(false);
      return;
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
    if (challengeError) {
      setError(challengeError.message);
      setSubmitting(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challenge.id,
      code: mfaCode.trim(),
    });
    if (verifyError) {
      setError(verifyError.message);
      setSubmitting(false);
      return;
    }

    goToDestination();
  }

  if (mfaFactorId) {
    return (
      <form onSubmit={onSubmitMfa} className="flex flex-col gap-4">
        {error ? (
          <AlertBanner title="Sign-in failed" tone="danger">{error}</AlertBanner>
        ) : null}

        <p className="text-sm leading-6 text-[var(--muted)]">
          Two-factor authentication is enabled on this account. Enter the 6-digit code from your authenticator app.
        </p>

        <label className="flex flex-col gap-1 text-sm font-bold text-[var(--foreground)]">
          Authentication code
          <input
            inputMode="numeric"
            maxLength={6}
            autoFocus
            required
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            className="ui-input font-semibold"
            placeholder="123456"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className={buttonStyles("primary", "bg-[var(--black-soft)] hover:bg-black")}
        >
          {submitting ? "Verifying…" : "Verify"}
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            setMfaFactorId("");
            setMfaCode("");
            setError(null);
          }}
          className="min-h-12 text-sm font-bold text-emerald-700 underline underline-offset-2"
        >
          Cancel, sign in as someone else
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error ? (
        <AlertBanner title="Sign-in failed" tone="danger">{error}</AlertBanner>
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
          className="ui-input font-semibold"
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
          className="ui-input font-semibold"
          placeholder="••••••••"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className={buttonStyles("primary", "bg-[var(--black-soft)] hover:bg-black")}
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-sm leading-6 text-[var(--muted)]">
        Use a real account. Demo role-switching is available in staging.
      </p>

      {devLoginEnabled ? (
        <Link
          href={next ? `/dev-login?next=${encodeURIComponent(next)}` : "/dev-login"}
          className="inline-flex min-h-12 items-center text-sm font-bold text-emerald-700 underline underline-offset-2"
        >
          Staging: use dev login instead
        </Link>
      ) : null}
    </form>
  );
}
