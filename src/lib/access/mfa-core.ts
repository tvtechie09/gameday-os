// MFA policy — pure, dependency-free (mirrors gameday-team-os/lib/mfa-core.ts;
// both apps sit on the same Supabase project, so the AAL model is identical).

export type AssuranceLevel = "aal1" | "aal2" | null;

// Supabase's own AAL model: a session only needs a second-factor challenge when
// the CURRENT level is weaker than what the user's enrolled factors require
// (nextLevel). A user with no verified factor has currentLevel === nextLevel
// (both aal1) and is never challenged — enrollment, not a stray flag, is what
// turns this on.
//
// Accepts plain strings because Supabase's SDK type is an open string union to
// leave room for future levels; we only compare for equality.
export function needsMfaChallenge(currentLevel: string | null | undefined, nextLevel: string | null | undefined): boolean {
  return Boolean(currentLevel && nextLevel && currentLevel !== nextLevel && nextLevel === "aal2");
}

const TOTP_CODE_PATTERN = /^\d{6}$/;

// Shape check before spending a round trip on a code that can't be valid.
// Supabase still re-validates server-side.
export function isPlausibleTotpCode(code: string): boolean {
  return TOTP_CODE_PATTERN.test(code.trim());
}
