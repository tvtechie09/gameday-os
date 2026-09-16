export type PilotBuildInfo = {
  enabled: boolean;
  commit: string;
  environment: "Pilot";
  stagingProjectRef: string | null;
};

export function isPilotPreviewEnvironment() {
  return process.env.PILOT_PREVIEW === "true"
    || (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === "security/audit-remediation-2026-08-28");
}

export function getPilotBuildInfo(): PilotBuildInfo | null {
  if (!isPilotPreviewEnvironment()) return null;
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.trim().slice(0, 7) || "local";
  const hostname = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    } catch {
      return "";
    }
  })();
  const stagingProjectRef = /^[a-z0-9]{20}\.supabase\.co$/.test(hostname) ? hostname.split(".")[0] : null;
  return { commit, enabled: true, environment: "Pilot", stagingProjectRef };
}
