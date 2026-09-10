export type PilotBuildInfo = {
  enabled: boolean;
  commit: string;
  environment: "Pilot";
  stagingProjectRef: string | null;
};

type PilotEnvironment = {
  PILOT_PREVIEW?: string;
  VERCEL_ENV?: string;
};

export function isPilotPreviewEnvironmentForEnvironment(env: PilotEnvironment) {
  return env.PILOT_PREVIEW === "true" && env.VERCEL_ENV !== "production";
}

export function isPilotPreviewEnvironment() {
  return isPilotPreviewEnvironmentForEnvironment({
    PILOT_PREVIEW: process.env.PILOT_PREVIEW,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
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
