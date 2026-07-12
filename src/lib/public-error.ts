const SENSITIVE_ERROR_PATTERN = /supabase|service_role|anon_key|environment|env\b|schema cache|postgres|pgrst|jwt/i;

/**
 * Returns an error message safe to render to end users. Configuration and
 * infrastructure errors (env vars, Supabase internals) are replaced with the
 * friendly fallback and logged server-side; other messages (validation copy
 * written for users) pass through unchanged.
 */
export function publicErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  if (!message) return fallback;
  if (SENSITIVE_ERROR_PATTERN.test(message)) {
    console.error("[public-error] " + fallback, error);
    return fallback + " Please try again, or contact your GameDay OS administrator.";
  }
  return message;
}
