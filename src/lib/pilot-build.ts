export type PilotBuildInfo = {
  enabled: boolean;
  commit: string;
  environment: "Pilot";
};

export function isPilotPreviewEnvironment() {
  return process.env.VERCEL_ENV === "preview" || process.env.PILOT_PREVIEW === "true";
}

export function getPilotBuildInfo(): PilotBuildInfo | null {
  if (!isPilotPreviewEnvironment()) return null;
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.trim().slice(0, 7) || "local";
  return { commit, enabled: true, environment: "Pilot" };
}
