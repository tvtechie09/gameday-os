// Edge-safe environment helpers. No server or Supabase imports so this can be
// shared by middleware (edge runtime) and server code alike.
import { isPilotPreviewEnvironment } from "../pilot-build.ts";

type DevLoginEnvironment = {
  NEXT_PUBLIC_ENABLE_DEV_LOGIN?: string;
  NODE_ENV?: string;
  PILOT_PREVIEW?: string;
  VERCEL_ENV?: string;
};

export function isDevLoginEnabledForEnvironment(env: DevLoginEnvironment): boolean {
  if (env.PILOT_PREVIEW === "true") return false;
  if (env.VERCEL_ENV) return false;
  return env.NODE_ENV === "development" && env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true";
}

// Dev-login is a local-development tool only. The public flag is an explicit
// developer opt-in, but the trusted server runtime classification is the
// security boundary: every Vercel-hosted environment and every non-development
// NODE_ENV fails closed. Pilot is checked explicitly as defense in depth.
export function isDevLoginEnabled(): boolean {
  if (isPilotPreviewEnvironment()) return false;
  return isDevLoginEnabledForEnvironment(process.env);
}
