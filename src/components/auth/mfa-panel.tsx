"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseAuthBrowserClient } from "@/lib/supabase/auth-browser";
import { isPlausibleTotpCode } from "@/lib/access/mfa-core";

type EnrollState = { factorId: string; qrCode: string; secret: string } | null;

// Two-factor enrollment (TOTP). The login form handles the CHALLENGE; this is
// where a factor gets created in the first place.
export function MfaPanel() {
  const supabase = useMemo(() => getSupabaseAuthBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [verifiedFactorId, setVerifiedFactorId] = useState("");
  const [enrolling, setEnrolling] = useState<EnrollState>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Dev-login issues a signed app cookie, NOT a Supabase Auth session, so the
  // MFA API has no bearer token to work with. Real production users sign in
  // through Supabase Auth and do have one. Detect it up front rather than
  // surfacing a raw "requires a valid Bearer token" error on button click.
  const [hasAuthSession, setHasAuthSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      // getUser(), not getSession(): getSession returns a CACHED session
      // without validating it, so a stale/expired token from an earlier
      // sign-in still looks like a live session and the MFA call then fails
      // with a raw "requires a valid Bearer token". getUser round-trips to
      // Supabase and tells the truth.
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (userError || !userData.user) {
        setHasAuthSession(false);
        setLoading(false);
        return;
      }
      setHasAuthSession(true);
      const { data } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      setVerifiedFactorId(data?.totp?.find((factor) => factor.status === "verified")?.id ?? "");
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function startEnrollment() {
    if (!supabase) return;
    setError("");
    setStatus("");
    setBusy(true);
    // An abandoned earlier attempt leaves an unverified factor behind and
    // Supabase rejects a second enroll with the same (blank) friendly name --
    // clear it so "Enable" works on every attempt, not just the first.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const stale = existing?.totp?.find((factor) => factor.status !== "verified");
    if (stale) await supabase.auth.mfa.unenroll({ factorId: stale.id });

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (enrollError) {
      setError(enrollError.message);
      return;
    }
    setEnrolling({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmEnrollment() {
    if (!supabase || !enrolling) return;
    if (!isPlausibleTotpCode(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError("");
    setBusy(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
    if (challengeError) {
      setBusy(false);
      setError(challengeError.message);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrolling.factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    setBusy(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    setVerifiedFactorId(enrolling.factorId);
    setEnrolling(null);
    setCode("");
    setStatus("Two-factor authentication is on. You'll be asked for a code next time you sign in.");
  }

  async function disable() {
    if (!supabase || !verifiedFactorId) return;
    setError("");
    setStatus("");
    setBusy(true);
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactorId });
    setBusy(false);
    if (unenrollError) {
      setError(unenrollError.message);
      return;
    }
    setVerifiedFactorId("");
    setStatus("Two-factor authentication is off.");
  }

  if (!supabase) return null;
  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }
  if (!hasAuthSession) {
    return (
      <p className="rounded-lg border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
        You&apos;re signed in through the staging dev-login, which doesn&apos;t create a Supabase Auth session — there&apos;s
        no account here to attach a second factor to. Sign in with a real email and password to manage two-factor
        authentication.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {status ? <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">{status}</p> : null}
      {error ? <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p> : null}

      {verifiedFactorId && !enrolling ? (
        <>
          <p className="text-sm leading-6">
            Two-factor authentication is <strong>on</strong>{" "}for this account. You&apos;ll enter a 6-digit code from
            your authenticator app each time you sign in.
          </p>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={disable}
              className="min-h-11 rounded-lg border border-red-300 px-4 text-sm font-bold text-red-700 disabled:opacity-50"
            >
              Turn off
            </button>
          </div>
        </>
      ) : null}

      {!verifiedFactorId && !enrolling ? (
        <>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Add a second step at sign-in with an authenticator app (1Password, Google Authenticator, Authy). Strongly
            recommended for platform and organization admins — this account can reach every venue&apos;s data.
          </p>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={startEnrollment}
              className="min-h-11 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white disabled:opacity-50"
            >
              Turn on two-factor authentication
            </button>
          </div>
        </>
      ) : null}

      {enrolling ? (
        <div className="grid gap-3">
          <p className="text-sm leading-6">Scan this with your authenticator app, then enter the 6-digit code it shows.</p>
          {/* Supabase returns a data: URI, not raw markup -- an <img> src, not innerHTML. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolling.qrCode} alt="Scan with your authenticator app" width={200} height={200} />
          <p className="text-xs text-[var(--muted)]">
            Can&apos;t scan? Enter this key manually: <code>{enrolling.secret}</code>
          </p>
          <label className="flex flex-col gap-1 text-sm font-bold">
            6-digit code
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
              className="min-h-11 max-w-40 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !isPlausibleTotpCode(code)}
              onClick={confirmEnrollment}
              className="min-h-11 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEnrolling(null);
                setCode("");
                setError("");
              }}
              className="min-h-11 rounded-lg border border-[var(--line)] px-4 text-sm font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
