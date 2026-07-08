// Seeded platform-admin id from supabase/identity-test-seed.sql, used as the
// interim operator until real Supabase Auth is connected to the server runtime.
export const seededOperatorUserId = "00000000-0000-0000-0000-000000000100";

// Pure resolution of the trusted operator id from a configured value. Kept free
// of Supabase / alias imports so it can be unit-tested directly. Falls back to
// the seeded platform-admin when nothing usable is configured.
export function resolveActorUserId(configuredOperatorUserId: string | null | undefined): string | null {
  const trimmed = configuredOperatorUserId?.trim();
  return trimmed ? trimmed : seededOperatorUserId;
}
