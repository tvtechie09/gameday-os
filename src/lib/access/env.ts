// Edge-safe environment helpers. No server or Supabase imports so this can be
// shared by middleware (edge runtime) and server code alike.
import { isPilotPreviewEnvironment } from "@/lib/pilot-build";

// Dev-login (demo users / impersonation-by-dev-login) is a staging/dev
// break-glass tool. Disabled in production unless explicitly enabled via env.
export function isDevLoginEnabled(): boolean {
  if (isPilotPreviewEnvironment()) return false;
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true";
}
