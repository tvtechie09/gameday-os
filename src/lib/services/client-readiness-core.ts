export const REFERENCE_DEMO_SOURCE = "gameday-reference-demo";
export const REFERENCE_DEMO_GAME_COUNT = 12;

export type ClientReadinessCheck = {
  detail: string;
  key: string;
  label: string;
  passed: boolean;
  required: boolean;
};

export type ReferenceDemoGame = {
  awayTeam: string;
  endTime: string;
  externalId: string;
  fieldId: string;
  homeTeam: string;
  startTime: string;
  title: string;
};

const teams = ["Lincoln Lightning", "Riverside Rockets", "Central Cyclones", "Parkside Panthers", "Northside Knights", "Westfield Wolves", "Lakeshore Legends", "Prairie Storm"] as const;

export function buildReferenceDemoGames({ fieldIds, organizationId, now }: { fieldIds: string[]; organizationId: string; now: number }): ReferenceDemoGame[] {
  if (fieldIds.length === 0) return [];
  const firstStart = now - 4 * 60 * 60 * 1000;
  return Array.from({ length: REFERENCE_DEMO_GAME_COUNT }, (_, index) => {
    const start = firstStart + index * 45 * 60 * 1000;
    const homeTeam = teams[index % teams.length];
    const awayTeam = teams[(index + 3) % teams.length];
    return {
      awayTeam,
      endTime: new Date(start + 90 * 60 * 1000).toISOString(),
      externalId: `${organizationId}:reference-game-${index + 1}`,
      fieldId: fieldIds[index % fieldIds.length],
      homeTeam,
      startTime: new Date(start).toISOString(),
      title: `${homeTeam} vs ${awayTeam}`,
    };
  });
}

export function buildClientReadinessChecks(input: { campaignCount: number; demoSessionCount: number; fieldCount: number; publicUrlReady: boolean; sponsorCount: number; venueProfileReady: boolean; weatherReady: boolean }): ClientReadinessCheck[] {
  return [
    { key: "venue", label: "Venue profile", detail: "Name, address, city, state, and timezone are present.", passed: input.venueProfileReady, required: true },
    { key: "fields", label: "Fields and QR destinations", detail: `${input.fieldCount} field${input.fieldCount === 1 ? "" : "s"} available.`, passed: input.fieldCount > 0, required: true },
    { key: "schedule", label: "Demo schedule", detail: `${input.demoSessionCount} resettable demo game${input.demoSessionCount === 1 ? "" : "s"}.`, passed: input.demoSessionCount >= REFERENCE_DEMO_GAME_COUNT, required: true },
    { key: "weather", label: "Weather posture", detail: "A configured weather profile supports the rehearsal story.", passed: input.weatherReady, required: true },
    { key: "public_url", label: "Shareable public URL", detail: "QR links resolve away from the presenter laptop.", passed: input.publicUrlReady, required: true },
    { key: "sponsor", label: "Sponsor proof", detail: `${input.sponsorCount} sponsor${input.sponsorCount === 1 ? "" : "s"} and ${input.campaignCount} campaign${input.campaignCount === 1 ? "" : "s"}.`, passed: input.sponsorCount > 0 && input.campaignCount > 0, required: false },
  ];
}

export function summarizeClientReadiness(checks: ClientReadinessCheck[]) {
  const required = checks.filter((check) => check.required);
  const requiredPassed = required.filter((check) => check.passed).length;
  return { blockers: required.filter((check) => !check.passed).map((check) => check.label), canDemo: requiredPassed === required.length, requiredPassed, requiredTotal: required.length };
}
